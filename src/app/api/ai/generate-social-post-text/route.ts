import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server'
import OpenAI from 'openai';
import * as cheerio from 'cheerio'; // Import cheerio

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to fetch and summarize URL content (Updated with Cheerio)
async function getUrlSummary(url: string): Promise<string> {
  try {
    console.log(`Fetching URL: ${url}`);
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }
    const htmlContent = await response.text();
    // console.log(`Fetched HTML content (first 500 chars): ${htmlContent.substring(0, 500)}...`);

    // --- Use Cheerio to extract text --- 
    console.log("Loading HTML into Cheerio...");
    const $ = cheerio.load(htmlContent);

    // Try common selectors for main content - this might need adjustment per site
    let mainText = '';
    $('article, .post-content, .entry-content, #main, #content, main').each((i, elem) => {
        // Prioritize specific content containers if found
        mainText = $(elem).text(); 
        if (mainText.length > 200) return false; // Stop if we found a decent chunk
    });

    // If no specific container text found, try grabbing all paragraphs
    if (mainText.length <= 200) {
        console.log("Main content selector didn't yield much, trying all paragraphs...");
        $('p').each((i, elem) => {
            mainText += $(elem).text() + '\n'; 
        });
    }
    
    // Basic cleanup
    mainText = mainText.replace(/\s\s+/g, ' ').trim();
    console.log(`Extracted text (first 500 chars): ${mainText.substring(0, 500)}...`);
    // --- End Cheerio extraction ---

    if (mainText.length < 50) { // Check if we actually got meaningful text
        console.warn("Extracted text seems too short, might be an issue with selectors or content.");
        // Fallback or throw error? For now, try summarizing what we have.
        if (!mainText) throw new Error("Could not extract any meaningful text content from the URL.");
    }

    const contentToSummarize = mainText.substring(0, 8000); // Summarize extracted text

    console.log("Requesting summary from OpenAI based on extracted text...");
    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-4", // Or a faster/cheaper model if preferred for summarization
      messages: [
        {
          role: "system",
          content: "You are an expert summarizer. Please extract the key information and main points from the following text content or HTML snippet provided by the user. Provide a concise summary suitable for understanding the core topic."
        },
        {
          role: "user",
          content: contentToSummarize,
        },
      ],
      temperature: 0.5,
      max_tokens: 250, // Adjust token limit as needed for summary length
    });

    const summary = summaryResponse.choices[0]?.message?.content?.trim();
    console.log("OpenAI Summary:", summary);

    if (!summary) {
        throw new Error("Failed to generate summary from OpenAI.");
    }
    return summary;

  } catch (error) {
    console.error(`Error fetching or summarizing URL ${url}:`, error);
    // Return a descriptive error message instead of throwing, 
    // so the main process can potentially continue without a summary.
    return `Error processing URL: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// Helper function to generate platform-specific prompt
function createPlatformPrompt(platform: string, urlSummary: string, payload: any): string {
  const { thoughts, tone, characterLength, sentiment, includeSource, linkedin_post_type, twitter_post_type, instagram_post_type } = payload;
  
  let prompt = "";
  
  // Platform specific instructions
  if (platform === 'linkedin') {
      prompt = `**Role:** Act as an informed LinkedIn expert proficient in creating professional, viral LinkedIn posts.

**Task:** Create an optimized LinkedIn post based on the provided article summary and user thoughts. The post should be tailored as a '${linkedin_post_type || 'thought leadership'}' piece.

**Input:**
1.  **Article Summary:** ${urlSummary}
2.  **User Thoughts:** ${thoughts}
3.  **Tone of Voice:** ${tone?.description || tone?.name || 'Professional and engaging'}
4.  **Sentiment:** ${sentiment || 'Neutral'}
5.  **Character Range Target:** ${characterLength || '1100-1300'} characters (Strictly adhere to LinkedIn limits, aim for this range).
6.  **Include Source URL (${payload.url}):** ${includeSource ? 'Yes, mention naturally if appropriate.' : 'No'}

**Output Guidelines:**
1.  **Structure:**
    a.  **Context/Main Idea:** Start with the key message or argument from the Article Summary.
    b.  **Integrate User Thoughts:** Weave in the User Thoughts as commentary, perspective, or addition to the main idea.
    c.  **Engaging Elements:** Include elements like a question to the audience or a compelling point to provoke thought. **Do NOT use emojis.**
    d.  **Hashtags:** Generate and include 3-5 relevant professional hashtags at the end.
2.  **Formatting:** Provide the response in plain text. Do not use asterisks, em-dashes, or other markdown syntax for formatting within the post body itself (hashtags at the end are ok). Use paragraphs for structure. **No emojis.**
3.  **Tone:** Strictly adhere to the specified Tone of Voice.
4.  **Content:** Ensure the core message reflects the Article Summary, enhanced by the user's thoughts.
5.  **DO NOT Include:** Do not include any preamble, headings, or commentary about the generation process itself. Output *only* the final LinkedIn post text.`;
  
  } else if (platform === 'twitter') {
    // Updated prompt for Twitter/X based on user template
    prompt = `**Role:** Act as an informed Twitter/X expert proficient in creating concise and engaging tweets.

**Task:** Create an optimized Tweet based on the provided article summary and user thoughts, following Twitter best practices.

**Input:**
1.  **Article Summary:** ${urlSummary}
2.  **User Thoughts:** ${thoughts}
3.  **Tone of Voice:** ${tone?.description || tone?.name || 'Clear, concise, and engaging'}
4.  **Sentiment:** ${sentiment || 'Neutral'}

**Output Guidelines:**
1.  **Format:** Structure the output implicitly as Hook-Explain-Question-Hashtags.
    a.  **Hook:** Start with a short, attention-grabbing sentence (the main point or a surprising fact).
    b.  **Explain:** Briefly elaborate on the hook, using key information or data from the Article Summary, integrated with the User Thoughts.
    c.  **Question:** End with a thought-provoking question relevant to the topic.
    d.  **Hashtags:** Include 1-2 relevant hashtags at the very end.
2.  **Conciseness:** Maximum 240 characters. Be extremely concise. Focus on ONE clear message.
3.  **Clarity:** Use clear, simple language. Be factual. Reference statistics/data from the summary if applicable.
4.  **Formatting:** Use plain text. Add a line break (space) between the Explain section, the Question, and the Hashtags. Do NOT start any sentence with an emoji.
5.  **Content:** Base the tweet primarily on the Article Summary, adding the User Thoughts as brief commentary or angle.
6.  **DO NOT Include:** Do not include the source URL. Do not include any preamble or commentary about the generation process. Most importantly, **DO NOT include the labels "Hook:", "Explain:", "Question:", or "Hashtags:" in your output.** Output *only* the final Tweet text itself, correctly formatted with line breaks where specified.`;

  } else if (platform === 'instagram') {
     // Updated prompt for Instagram based on user template
    prompt = `**Role:** You are an Instagram caption expert with 10 years of experience crafting engaging, high-performing post copy for top brands.

**Task:** Create an optimized Instagram caption based on the provided article summary and user thoughts. The caption should accompany an image related to the content.

**Input:**
1.  **Article Summary:** ${urlSummary}
2.  **User Thoughts:** ${thoughts}
3.  **Tone of Voice:** ${tone?.description || tone?.name || 'Playful, opinionated, and professional (e.g., Finance/AI focus)'}
4.  **Sentiment:** ${sentiment || 'Neutral'}
5.  **Include Source URL (${payload.url}):** ${includeSource ? 'Yes, mention briefly if relevant.' : 'No'}
6.  **Style Hint:** ${instagram_post_type || 'Visual Story / Insight'}

**Output Guidelines:**
1.  **Caption Formula:** Follow this structure: Hook -> Context -> Details/Story -> Lesson/Insight -> CTA (optional engaging question) -> Hashtags.
2.  **Hook:** Grab attention in the first sentence (curiosity, emotion, question, bold statement).
3.  **Content:** Base the caption primarily on the Article Summary. Integrate User Thoughts naturally. If the summary is based on an article, write in the third person (they/them/their names); otherwise, first person is okay.
4.  **Conciseness:** Use clear, everyday words (<20 words per sentence). Vary sentence length but keep it scannable.
5.  **Tone:** Strictly adhere to the specified Tone of Voice. Be positive and ambitious.
6.  **Emojis:** Use emojis *sparingly* (1-3 total) ONLY at the end of sentences for personality and clarity. Do NOT place two emojis next to each other.
7.  **CTA:** If appropriate, include an engaging question to encourage interaction (likes, comments, saves).
8.  **Hashtags:** Include a mix of 3-6 relevant hashtags. MUST include #Exlayr and #LoveTheMachines. Put key hashtags early if possible.
9.  **Formatting:** Provide the response in PLAIN TEXT ONLY. No asterisks (*), no em-dashes (—), no markdown. Use line breaks for paragraphs.
10. **Quality:** Fact-check any claims implicitly made. Proofread for spelling, grammar, and style consistency. Avoid cringe.
11. **DO NOT Include:** Do not output anything other than the final Instagram caption text itself. No preamble, no headings, no commentary.`;

  } else {
      // Fallback for unknown platform?
      prompt = `Summarize this content: ${urlSummary}. User thoughts: ${thoughts}`; 
  }

  console.log(`--- Generated Prompt for ${platform} ---`);
  console.log(prompt);
  console.log(`-------------------------------------`);

  return prompt;
}

// Main generation function (updated for actual generation)
async function generateText(payload: any) {
  console.log("Received payload for text generation:", JSON.stringify(payload, null, 2));
  
  let urlSummary = 'No URL provided or summary failed.';
  if (payload.url) {
      urlSummary = await getUrlSummary(payload.url);
      if (urlSummary.startsWith('Error processing URL:')) {
          console.warn("Proceeding without valid URL summary.");
          // Allow generation, but the prompt will reflect the summary failure.
      }
  }

  const generatedTexts: { [key: string]: string } = {};
  const generationPromises: Promise<void>[] = [];

  for (const platform of payload.platforms) {
    if (platform !== 'linkedin' && platform !== 'twitter' && platform !== 'instagram') continue; // Safety check

    const platformPrompt = createPlatformPrompt(platform, urlSummary, payload);

    // --- Handle different models --- 
    // Currently only implementing OpenAI (GPT-4 as default)
    if (payload.selectedModel.startsWith('gpt')) { 
        generationPromises.push((async () => {
          try {
            console.log(`Generating text for ${platform} using ${payload.selectedModel}...`);
            const completion = await openai.chat.completions.create({
              model: payload.selectedModel, // Use the selected model value
              messages: [
                { role: "system", content: "You are an expert social media content creator specializing in tailoring posts for specific platforms based on source material and user instructions." },
                { role: "user", content: platformPrompt }
              ],
              temperature: 0.7,
              // max_tokens: calculate based on characterLength? Need mapping.
            });
            const text = completion.choices[0]?.message?.content?.trim();
            if (text) {
              generatedTexts[platform] = text;
              console.log(`Successfully generated text for ${platform}`);
            } else {
              throw new Error('OpenAI returned empty content.');
            }
          } catch (error) {
             console.error(`Error generating text for ${platform} using OpenAI:`, error);
             generatedTexts[platform] = `Error generating content for ${platform}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        })());
    } else if (payload.selectedModel.startsWith('gemini')) {
        // TODO: Implement Gemini API call
        console.warn(`Gemini generation not yet implemented for ${platform}`);
        generatedTexts[platform] = `Gemini generation for ${platform} is not yet implemented.`;
    } else if (payload.selectedModel.startsWith('claude')) {
         // TODO: Implement Claude API call
        console.warn(`Claude generation not yet implemented for ${platform}`);
        generatedTexts[platform] = `Claude generation for ${platform} is not yet implemented.`;
    } else if (payload.selectedModel.startsWith('deepseek')) {
         // TODO: Implement DeepSeek API call
        console.warn(`DeepSeek generation not yet implemented for ${platform}`);
        generatedTexts[platform] = `DeepSeek generation for ${platform} is not yet implemented.`;
    } else {
        console.warn(`Unsupported model selected: ${payload.selectedModel}`);
        generatedTexts[platform] = `Model ${payload.selectedModel} is not supported.`;
    }
  } // end loop over platforms

  // Wait for all concurrent generation requests to complete
  await Promise.all(generationPromises);

  console.log("Finished all text generation requests.");

  return {
    success: true, // Consider making success=false if all generations failed?
    generatedTexts: generatedTexts
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Basic validation (can be expanded)
    if (!body.url || !body.thoughts || !body.selectedModel || !body.platforms || body.platforms.length === 0) {
      return NextResponse.json({ success: false, message: 'Missing required fields.' }, { status: 400 });
    }

    // Call the generation logic (now includes summarization)
    const result = await generateText(body);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      // Handle potential errors from generateText if implemented later
      return NextResponse.json({ success: false, message: 'Failed to generate text.' }, { status: 500 });
    }

  } catch (error) {
    console.error('[API generate-social-post-text] Error:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
} 