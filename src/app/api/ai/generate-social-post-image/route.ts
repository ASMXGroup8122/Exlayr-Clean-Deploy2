import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid'; // For generating unique filenames
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Initialize OpenAI client to use for prompt engineering
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase client with service role key (bypasses RLS)
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key instead of anon key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Function to generate optimized prompt using OpenAI
async function generateOptimizedPrompt(platform: string, promptText: string, imageType: string, additionalContext?: any): Promise<string> {
  try {
    // First, extract the key themes from the text before generating the image prompt
    const themeExtractionPrompt = `You are an expert at extracting visual themes from text for image generation.

Read the following text carefully and identify 1-3 VERY SPECIFIC visual themes that would make compelling, relevant images:

TEXT CONTENT:
"${promptText.substring(0, 1500)}"

${additionalContext ? `
ADDITIONAL CONTEXT:
- User's thoughts/commentary: "${additionalContext.userThoughts}"
- Content summary: "${additionalContext.contentSummary}"
- Sentiment: "${additionalContext.sentiment}"
- Topic/category: "${additionalContext.topic}"
` : ''}

For example:
- For an article about "non-doms fleeing the UK due to tax changes" → themes might include "luxury private jet taking off", "wealthy businessman looking at London skyline from penthouse", "moving boxes in mansion hallway"
- For content about "regulating financial markets" → themes might include "frustrated trader at multiple screens", "SEC officials examining documents", "Wall Street with regulatory barriers"
- For a post about "AI in healthcare" → themes might include "doctor reviewing scan with AI overlay", "robot arm assisting in surgery", "patient with medical wearable technology"

EXTRACT SPECIFIC VISUAL SCENES related to ${platform} platform's audience.
Your output should be 1-3 specific visual themes that capture the essence of the text.
Be extremely specific and vivid. Focus on scenes, not concepts.
Make sure the themes are VARIED and DIFFERENT from generic corporate imagery.

IMPORTANT: For LinkedIn specifically, AVOID standard office settings, handshakes, or generic business people at computers unless directly relevant to the specific content.
`;

    // First call to extract themes
    console.log("Extracting specific themes from content...");
    const themeResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert at extracting visual themes from text." },
        { role: "user", content: themeExtractionPrompt }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    const extractedThemes = themeResponse.choices[0]?.message?.content?.trim() || "Professional business setting";
    console.log("Extracted themes:", extractedThemes);

    // Create a prompt engineering template with the extracted themes
    const promptEngineeringTemplate = `You are an expert image prompt engineer for a professional AI image generator.

EXTRACTED THEMES FROM CONTENT:
${extractedThemes}

Your task is to craft ONE specific, vivid image prompt based on these themes and the following criteria.

For LinkedIn specifically, create unique, attention-grabbing professional images. AVOID GENERIC OFFICE SETTINGS unless specifically relevant to the content.

---

If ${imageType} is **photorealistic editorial** or **cinematic illustration**:

Create a scene with extreme realism and cinematic tension that incorporates one of the extracted themes above.
Use the following visual criteria:
• Shot on a Canon EOS R5 or Sony A7R IV with an 85mm f/1.4 lens  
• Shallow depth of field — blurred background, sharp foreground  
• Realistic skin pores, textured fabric, glass reflections, subtle wrinkles  
• Moody, directional lighting or soft backlight (e.g., window or lamp)  
• Emotion: visible tension, worry, resolve, frustration, ambition  
• Colour grade like a prestige drama (Succession, Blade Runner 2049)  
• IMPORTANT: Avoid generic business people at computers or in meetings unless directly relevant to the theme
• IMPORTANT: Create specific, unique scenes based on the extracted themes
• Use perspective, camera angle, and framing to create visual interest

These images will look like:
"As seen in Bloomberg Magazine"
"Editorial photography for Financial Times, 2025"
"Corporate marketing brochure photo"
"Photographed by Annie Leibovitz for TIME Business"

---

If ${imageType} is **infographic**:

Design a high-end editorial infographic based on the extracted themes, like those published in The Economist or McKinsey reports.
Include:
• Authentic chart types directly related to the themes: bar, pie, line, stacked area  
• Clean colour palette: navy, red, grey, teal — corporate, not playful  
• Bold, legible fonts and crisp labelling  
• Grid-based layout with balanced whitespace  
• Legends, captions, and icons placed professionally  
• Light background with sharp contrast (white, off-grey, or soft blue)  
• Visual elements that specifically illustrate the extracted themes
• Professional 3d depth/shadow where appropriate

---

If the ${imageType} is **cartoon**:

Create a sharp, high-contrast cartoon or editorial satire illustration based on the extracted themes.
Use:
• Characters and scenes that specifically illustrate the extracted themes
• Exaggerated characters that represent the key concepts (e.g., greedy bankers, tech innovators)  
• Bold ink outlines, flat colour fills  
• Visual metaphors directly related to the themes
• Heavy shadows or spot colour lighting for drama  
• New Yorker or Politico editorial cartoon style

---

If the ${imageType} is **surreal**:

Create a dreamlike and symbolic image that bends physical laws based on the extracted themes.
Use:
• Juxtaposition of incompatible elements directly related to the themes
• Impossible structures that represent the key concepts
• Fog, glowing light, reflections, broken physics  
• Strange emotional tones — fear, awe, detachment  
• Stylised realism with absurd logic — like Salvador Dalí meets sci-fi

---

If ${imageType} type is **ai futuristic**:

Create a high-tech futuristic scene with next-gen aesthetics based on the extracted themes.
Use:
• Chrome, glass, carbon-fibre, neon, synthetic textures  
• Blue, orange, and white lighting  
• High-tech elements directly related to the themes (e.g., advanced analytics dashboards for finance, medical tech for healthcare)
• Floating data, symmetrical compositions, ultra-clean UI directly related to the themes
• Massive control rooms, LED tickers, futuristic lab settings as relevant to the themes

---

Article/Post Content (Summary): ${promptText.substring(0, 300)}...
Extracted Themes: ${extractedThemes}
Platform: ${platform} (optimize for this platform's aesthetic)
Image Style: ${imageType}

Now write a **single final prompt** for the AI image model that captures all this in one sentence or paragraph. Be visually vivid, technically precise, and focused on one of the extracted themes to create a unique, attention-grabbing image.

IMPORTANT: You must ensure that the image prompt is safe and passes content filters.
Do NOT include anything that could be interpreted as:
- Falling people
- Danger, harm, panic, or physical struggle
- Death, injury, weapons, or risk of harm
- Excessive emotional distress
If you want to express difficulty or challenge, use metaphors like heavy weather, complex architecture, abstract visuals, or posture — not literal falling, collapsing, or distress.

IMPORTANT: ADD RANDOM CREATIVE ELEMENTS to ensure variety (unique lighting, unusual perspective, specific props, distinctive setting, etc.)`;

    // Call OpenAI to generate an optimized prompt
    console.log("Generating optimized prompt using GPT-4o-mini...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert image prompt engineer."
        },
        {
          role: "user",
          content: promptEngineeringTemplate
        }
      ],
      temperature: 0.9, // Increased temperature for more variety
      max_tokens: 300
    });

    const optimizedPrompt = response.choices[0]?.message?.content?.trim();
    if (!optimizedPrompt) {
      throw new Error("Failed to generate optimized prompt");
    }

    console.log("Generated optimized prompt:", optimizedPrompt);
    return optimizedPrompt;
  } catch (error) {
    console.error("Error generating optimized prompt:", error);
    // Fall back to a simpler prompt if the advanced prompt generation fails
    return fallbackGeneratePrompt(platform, promptText, imageType);
  }
}

// Fallback prompt generation if OpenAI call fails
function fallbackGeneratePrompt(platform: string, promptText: string, imageType: string): string {
  const coreIdea = promptText?.substring(0, 300) || "social media post";
  let basePrompt = '';
  
  // Platform-specific adjustments
  const platformSpecific = {
    linkedin: "Professional and business-oriented imagery suitable for LinkedIn. Corporate style with clean presentation.",
    twitter: "Attention-grabbing and dynamic image with high contrast for Twitter feed visibility.",
    instagram: "Visually stunning and aesthetic image optimized for Instagram engagement."
  };

  // Image type specific styling
  switch (imageType.toLowerCase()) {
    case 'photorealistic editorial':
      basePrompt = `Create a photorealistic editorial image representing: "${coreIdea}". Shot on high-end camera with realistic lighting, depth of field, and professional composition. Should look like professional editorial photography for business publications.`;
      break;
    case 'cinematic illustration':
      basePrompt = `Create a cinematic illustration representing: "${coreIdea}". Dramatic lighting, film-like color grading, with professional composition and emotional impact.`;
      break;
    case 'infographic':
      basePrompt = `Create a professional infographic visualizing: "${coreIdea}". Clean design with data visualization elements like charts, graphs, and clear typography. Business style similar to The Economist or McKinsey reports.`;
      break;
    case 'cartoon':
      basePrompt = `Create a high-contrast cartoon or editorial illustration about: "${coreIdea}". Bold outlines, flat colors, and visual metaphors in the style of editorial cartoons.`;
      break;
    case 'surreal':
      basePrompt = `Create a dreamlike, surreal image symbolizing: "${coreIdea}". Juxtaposition of incompatible elements, impossible structures, with a dreamlike quality that bends reality.`;
      break;
    case 'ai futuristic':
      basePrompt = `Create a high-tech futuristic scene representing: "${coreIdea}". Chrome, glass, neon lighting, digital interfaces, clean aesthetics with a sense of advanced technology.`;
      break;
    default:
      basePrompt = `Create a professional image representing: "${coreIdea}". High quality, well-composed, and suitable for business context.`;
  }

  // Combine with platform-specific guidance
  const fullPrompt = `${basePrompt} ${platformSpecific[platform as keyof typeof platformSpecific] || ''}. The image should be high quality, engaging, and appropriate for professional social media.`;
  
  // Add safety guidelines
  return `${fullPrompt} Image must be safe for work, avoiding any concerning, harmful, or risky depictions. Create a positive, professional representation.`;
}

// Function to determine the appropriate size for image generation based on platform
// Only using supported sizes: '1024x1024', '1024x1536', '1536x1024', 'auto'
function getImageSize(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'linkedin':
    case 'twitter': 
      return "1536x1024"; // Landscape for LinkedIn and Twitter (supported size)
    case 'instagram':
      // For Instagram we could use either square or portrait
      // Could be randomized or based on content type
      const usePortrait = Math.random() > 0.5; // 50% chance of portrait
      return usePortrait ? "1024x1536" : "1024x1024"; // Portrait or square (both supported)
    default:
      return "1024x1024"; // Default to square for unknown platforms
  }
}

// Main function to generate images
async function generateImage(payload: any): Promise<{ 
  success: boolean, 
  imageUrl?: string, 
  b64Json?: string, // Add b64Json to the return type
  message?: string 
}> {
  console.log("Received payload for image generation:", JSON.stringify(payload, null, 2));
  const { promptText, imageType, platform, additionalContext } = payload;
  // Defaulting to PNG as it supports transparency well and is a default for gpt-image-1 if not specified.
  const outputFormat = 'png'; 
  const contentType = `image/${outputFormat}`;

  if (!platform || !['linkedin', 'twitter', 'instagram'].includes(platform.toLowerCase())) {
    return { success: false, message: 'Invalid platform specified' };
  }

  const imageSize = getImageSize(platform);
  
  try {
    // Include additionalContext in the prompt generation if available
    const contextualData = additionalContext ? {
      userThoughts: additionalContext.userThoughts || '',
      sentiment: additionalContext.sentiment || '',
      contentSummary: additionalContext.contentSummary || '',
      topic: additionalContext.topic || ''
    } : null;
    
    // Pass the enhanced context to the prompt generator
    const imagePrompt = await generateOptimizedPrompt(
      platform, 
      promptText, 
      imageType || 'photorealistic editorial',
      contextualData
    );
    
    console.log(`Generating image for ${platform} with size ${imageSize} using gpt-image-1`);
    console.log(`Final image prompt: ${imagePrompt}`);

    // Call OpenAI API directly using the gpt-image-1 model
    const openAIResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: imagePrompt,
        n: 1,
        size: imageSize,
        quality: "high" // Valid for gpt-image-1: 'low', 'medium', 'high', 'auto'
      })
    });

    if (!openAIResponse.ok) {
      let errorMessage = `OpenAI API returned ${openAIResponse.status}`;
      try {
        const errorData = await openAIResponse.json();
        errorMessage += `: ${JSON.stringify(errorData, null, 2)}`;
      } catch (e) {
        // If response is not JSON, use text
        const errorText = await openAIResponse.text();
        errorMessage += `: ${errorText}`;
      }
      console.error('OpenAI API Error:', errorMessage);
      throw new Error(errorMessage);
    }

    const responseData = await openAIResponse.json();
    
    if (!responseData || !responseData.data || responseData.data.length === 0) {
      throw new Error(`Unexpected response format from OpenAI: ${JSON.stringify(responseData)}`);
    }
    
    const b64JsonData = responseData.data[0]?.b64_json;
    if (!b64JsonData) {
      throw new Error(`No b64_json in OpenAI response: ${JSON.stringify(responseData)}`);
    }

    console.log("Received b64_json data from OpenAI (snippet):", b64JsonData.substring(0,100) + "...");

    // 1. Decode base64 to a Buffer
    const imageBuffer = Buffer.from(b64JsonData, 'base64');
    
    // 2. Define file path and name for Supabase
    const fileName = `${uuidv4()}.${outputFormat}`;
    const filePathInBucket = `public/${fileName}`;

    // 3. Upload to Supabase using admin client (bypasses RLS)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('social-media-images')
      .upload(filePathInBucket, imageBuffer, {
        contentType: contentType,
        upsert: true, // Change to true to overwrite if exists
        cacheControl: '3600' // 1 hour cache
      });

    if (uploadError) {
      console.error("Supabase Storage Upload Error:", uploadError);
      throw new Error(`Failed to upload image to Supabase: ${uploadError.message}`);
    }

    // 4. Get the public URL using admin client
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('social-media-images')
      .getPublicUrl(filePathInBucket, {
        download: false // URL for viewing, not downloading
      });

    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error("Supabase Get Public URL Error: No publicUrl found or error in retrieving.");
      throw new Error('Failed to get public URL from Supabase. Check bucket policies and file path.');
    }
    const supabaseImageUrl = publicUrlData.publicUrl;

    console.log("Image uploaded to Supabase. Public URL:", supabaseImageUrl);

    return {
      success: true,
      imageUrl: supabaseImageUrl,
      b64Json: b64JsonData // Return the original base64 data as well
    };

  } catch (error) {
    console.error("Error during image generation and upload:", error);
    // Ensure the message is a string
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { 
      success: false, 
      message: errorMessage
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Basic validation
    if (!body.promptText || !body.platform) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required fields for image generation.' 
      }, { status: 400 });
    }

    // Set default image type if not provided
    if (!body.imageType) {
      body.imageType = 'photorealistic editorial';
    }

    // Call the generation logic
    const result = await generateImage(body);

    return NextResponse.json(result, { status: result.success ? 200 : 500 });

  } catch (error) {
    console.error('[API generate-social-post-image] Error:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
} 