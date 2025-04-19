'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { use } from 'react';
import Link from 'next/link';

interface SocialPostPageProps {
  params: Promise<{
    orgId: string;
  }>;
}

export default function SocialPostPage({ params }: SocialPostPageProps) {
  const { orgId } = use(params);
  const router = useRouter();
  const [formData, setFormData] = useState({
    url: '',
    include_source: true,
    sentiment: '',
    thoughts: '',
    character_length: '',
    email: '',
    linkedin_post_type: '',
    twitter_post_type: '',
    instagram_post_type: '',
    add_podcast: false,
    multiple_news_items: false,
    podcast_category: '',
    additional_instructions: '',
    platforms: {
      linkedin: false,
      twitter: false,
      instagram: false
    }
  });

  const sentimentOptions = [
    'Agree',
    'Disagree',
    'Both sides',
    'Other'
  ];

  const characterLengthOptions = [
    '500-800',
    '1100-1300',
    '1500-1800'
  ];

  const linkedinPostTypes = [
    'Thought Leadership',
    'Industry News',
    'Company News',
    'Product Updates',
    'Event Promotion',
    'Customer Success Story',
    'Market Analysis',
    'Educational Content',
    'Team Spotlight',
    'Behind the Scenes',
    'Industry Trends',
    'Tips and How-tos',
    'Company Culture',
    'Partnership Announcement',
    'Awards and Recognition'
  ];

  const twitterPostTypes = [
    'News Update',
    'Industry Insight',
    'Quick Tip',
    'Question/Poll',
    'Company Update'
  ];

  const instagramPostTypes = [
    'Visual Story',
    'Product Showcase',
    'Team Feature',
    'Event Highlight',
    'Behind the Scenes'
  ];

  const podcastCategories = [
    'AI',
    'Crypto',
    'Real World Assets'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      timestamp: new Date().toISOString(),
      organization_id: orgId,
      ...formData,
      platforms: formData.platforms
    };

    try {
      const response = await fetch('https://app.exlayr.ai/webhook/socialpost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        router.push(`/dashboard/sponsor/${orgId}/campaigns`);
      } else {
        const errorText = await response.text();
        console.error('Failed to submit social post. Status:', response.status, 'Response:', errorText);
      }
    } catch (error) {
      console.error('Error submitting social post:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto p-4 sm:p-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="url">URL *</Label>
              <Input
                id="url"
                required
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="Enter the URL you want to post about"
                className="w-full"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Switch
                id="include-source"
                checked={formData.include_source}
                onCheckedChange={(checked) => setFormData({ ...formData, include_source: checked })}
              />
              <Label htmlFor="include-source">Include source in post</Label>
            </div>

            <div className="space-y-2">
              <Label>Sentiment *</Label>
              <Select
                value={formData.sentiment}
                onValueChange={(value) => setFormData({ ...formData, sentiment: value })}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select sentiment" />
                </SelectTrigger>
                <SelectContent>
                  {sentimentOptions.map((option) => (
                    <SelectItem key={option} value={option.toLowerCase()}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="thoughts">Your thoughts on this *</Label>
              <Textarea
                id="thoughts"
                required
                value={formData.thoughts}
                onChange={(e) => setFormData({ ...formData, thoughts: e.target.value })}
                placeholder="Share your thoughts on this content"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Character Length *</Label>
              <Select
                value={formData.character_length}
                onValueChange={(value) => setFormData({ ...formData, character_length: value })}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select character length" />
                </SelectTrigger>
                <SelectContent>
                  {characterLengthOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter your email"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>LinkedIn Post Type *</Label>
              <Select
                value={formData.linkedin_post_type}
                onValueChange={(value) => setFormData({ ...formData, linkedin_post_type: value })}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select LinkedIn post type" />
                </SelectTrigger>
                <SelectContent>
                  {linkedinPostTypes.map((type) => (
                    <SelectItem key={type} value={type.toLowerCase()}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Twitter Post Type</Label>
              <Select
                value={formData.twitter_post_type}
                onValueChange={(value) => setFormData({ ...formData, twitter_post_type: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Twitter post type" />
                </SelectTrigger>
                <SelectContent>
                  {twitterPostTypes.map((type) => (
                    <SelectItem key={type} value={type.toLowerCase()}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Instagram Post Type</Label>
              <Select
                value={formData.instagram_post_type}
                onValueChange={(value) => setFormData({ ...formData, instagram_post_type: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Instagram post type" />
                </SelectTrigger>
                <SelectContent>
                  {instagramPostTypes.map((type) => (
                    <SelectItem key={type} value={type.toLowerCase()}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Switch
                  id="add-podcast"
                  checked={formData.add_podcast}
                  onCheckedChange={(checked) => setFormData({ ...formData, add_podcast: checked })}
                />
                <Label htmlFor="add-podcast">Add to podcast</Label>
              </div>

              {formData.add_podcast && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 ml-0 sm:ml-6">
                    <Switch
                      id="multiple-news"
                      checked={formData.multiple_news_items}
                      onCheckedChange={(checked) => setFormData({ ...formData, multiple_news_items: checked })}
                    />
                    <Label htmlFor="multiple-news">Multiple news items (max 6 sources)</Label>
                  </div>

                  <div className="space-y-2 ml-0 sm:ml-6">
                    <Label>Podcast Category</Label>
                    <Select
                      value={formData.podcast_category}
                      onValueChange={(value) => setFormData({ ...formData, podcast_category: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select podcast category" />
                      </SelectTrigger>
                      <SelectContent>
                        {podcastCategories.map((category) => (
                          <SelectItem key={category} value={category.toLowerCase()}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional-instructions">Additional Instructions</Label>
              <Textarea
                id="additional-instructions"
                value={formData.additional_instructions}
                onChange={(e) => setFormData({ ...formData, additional_instructions: e.target.value })}
                placeholder="Any additional instructions or notes"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Platforms *</Label>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex items-center gap-2">
                  <Switch
                    id="platform-linkedin"
                    checked={formData.platforms.linkedin}
                    onCheckedChange={checked => setFormData({ ...formData, platforms: { ...formData.platforms, linkedin: checked } })}
                    className="data-[state=checked]:bg-blue-600"
                  />
                  <Label htmlFor="platform-linkedin">LinkedIn</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="platform-twitter"
                    checked={formData.platforms.twitter}
                    onCheckedChange={checked => setFormData({ ...formData, platforms: { ...formData.platforms, twitter: checked } })}
                    className="data-[state=checked]:bg-blue-600"
                  />
                  <Label htmlFor="platform-twitter">X (Twitter)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="platform-instagram"
                    checked={formData.platforms.instagram}
                    onCheckedChange={checked => setFormData({ ...formData, platforms: { ...formData.platforms, instagram: checked } })}
                    className="data-[state=checked]:bg-blue-600"
                  />
                  <Label htmlFor="platform-instagram">Instagram</Label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-4">
        <Link href="/dashboard/approvals" className="text-sm text-blue-600 hover:underline w-full sm:w-auto text-center">
          View Pending Approvals
        </Link>
        <Button 
          type="submit" 
          className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
        >
          Create Social Post
        </Button>
      </div>
    </form>
  );
} 