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
async function generateOptimizedPrompt(platform: string, promptText: string, imageType: string): Promise<string> {
  try {
    // Create a prompt engineering template based on the provided guidance
    const promptEngineeringTemplate = `You are an expert image prompt generator for a visual AI.

Your task is to read the provided article and user commentary, and generate a visually stunning, emotionally charged, and technically precise image prompt. The image must reflect the provided image style.

Use the guidance below to shape the final result based on the image style: ${imageType}.

---

If ${imageType} is **photorealistic editorial** or **cinematic illustration**:

Create a scene with extreme realism and cinematic tension.  
Use the following visual criteria:
• Shot on a Canon EOS R5 or Sony A7R IV with an 85mm f/1.4 lens  
• Shallow depth of field — blurred background, sharp foreground  
• Realistic skin pores, textured fabric, glass reflections, subtle wrinkles  
• Moody, directional lighting or soft backlight (e.g., window or lamp)  
• Emotion: visible tension, worry, resolve, frustration, ambition  
• Colour grade like a prestige drama (Succession, Blade Runner 2049)  
• Dust in sunlight, fingerprints on glass, crumpled paper on desks  
• Weather effects: rain on glass, foggy skyline, golden hour glow  
• Background elements must reflect reality — clutter, cables, post-its, signage  
• Scene should look like a movie still — clean, real, intentional

These images will look like those 

"As seen in Bloomberg Magazine"
"Editorial photography for Financial Times, 2025"
"Corporate marketing brochure photo"
"Photographed by Annie Leibovitz for TIME Business"
Avoid anything stylised, sepia, painterly, or soft. No artistic blur.

---

If ${imageType} type is **infographic**:

Design a high-end editorial infographic, like those published in The Economist or McKinsey reports.  
Include:
• Authentic chart types: bar, pie, line, stacked area  
• Clean colour palette: navy, red, grey, teal — corporate, not playful  
• Bold, legible fonts and crisp labelling  
• Grid-based layout with balanced whitespace  
• Legends, captions, and icons placed professionally  
• Light background with sharp contrast (white, off-grey, or soft blue)  
• Optional overlay of real exchange names, ticker codes, or data points  
• Visual focus on clarity and data precision
-Professional 3d depth/shadow where appropriate

Avoid childish icons or decorative elements.

---

If the ${imageType} is **cartoon**:

Create a sharp, high-contrast cartoon or editorial satire illustration.  
Use:
• Exaggerated characters (e.g., greedy bankers, panicked investors)  
• Bold ink outlines, flat colour fills  
• Visual metaphors (e.g., collapsing ladders, golden parachutes, empty IPO boxes)  
• Speech bubbles, placards, ticker tape with sarcasm or satire  
• Heavy shadows or spot colour lighting for drama  
• New Yorker or Politico editorial cartoon style

Avoid realism. It should be expressive, stylised, and confrontational.

---

If the ${imageType} is **surreal**:

Create a dreamlike and symbolic image that bends physical laws.  
Use:
• Juxtaposition of incompatible elements (e.g., stock charts melting into sand, oil barrels floating in space)  
• Impossible structures (e.g., staircases to nowhere, glass domes underwater)  
• Fog, glowing light, reflections, broken physics  
• Strange emotional tones — fear, awe, detachment  
• Stylised realism with absurd logic — like Salvador Dalí meets sci-fi

Avoid anything literal. It should make viewers feel disoriented and curious.

---

If ${imageType} type is **ai futuristic**:

Create a high-tech futuristic scene with next-gen aesthetics.  
Use:
• Chrome, glass, carbon-fibre, neon, synthetic textures  
• Blue, orange, and white lighting  
• Robotic figures, digital interfaces, AR overlays  
• Floating data, symmetrical compositions, ultra-clean UI  
• AI-human hybrids, digital avatars, token vaults  
• Massive control rooms, LED tickers, quantum computing labs  
• Branding or interface elements with real depth

Avoid messy cyberpunk grunge unless the theme demands it. Prioritise clean power and elegance.

---

Article/Post Content: ${promptText}
Platform: ${platform} (optimize for this platform's aesthetic)
Image Style: ${imageType}

Now write a **single final prompt** for the AI image model that captures all this in one sentence or paragraph. Be visually vivid, technically precise, and focused on delivering a wow factor image.
IMPORTANT: You must ensure that the image prompt is safe and passes OpenAI's content filters.  
Do NOT include anything that could be interpreted as:
- Falling people
- Danger, harm, panic, or physical struggle
- Death, injury, weapons, or risk of harm
- Excessive emotional distress
If you want to express difficulty or challenge, use metaphors like heavy weather, complex architecture, abstract visuals, or posture — not literal falling, collapsing, or distress.`;

    // Call OpenAI to generate an optimized prompt
    console.log("Generating optimized prompt using GPT-4...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Use a more affordable model for prompt generation
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
      temperature: 0.7,
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
  const { promptText, imageType, platform } = payload;
  // Defaulting to PNG as it supports transparency well and is a default for gpt-image-1 if not specified.
  const outputFormat = 'png'; 
  const contentType = `image/${outputFormat}`;

  if (!platform || !['linkedin', 'twitter', 'instagram'].includes(platform.toLowerCase())) {
    return { success: false, message: 'Invalid platform specified' };
  }

  const imageSize = getImageSize(platform);
  
  try {
    const imagePrompt = await generateOptimizedPrompt(platform, promptText, imageType || 'photorealistic editorial');
    
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
        upsert: false
      });

    if (uploadError) {
      console.error("Supabase Storage Upload Error:", uploadError);
      throw new Error(`Failed to upload image to Supabase: ${uploadError.message}`);
    }

    // 4. Get the public URL using admin client
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('social-media-images')
      .getPublicUrl(filePathInBucket);

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