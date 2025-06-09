import { markdownToBlocks } from '@tryfabric/martian';
import { Summary } from '@/types';

interface NotionConfig {
  apiKey: string;
  pageId: string;
}

interface MeetingData {
  id: string;
  title: string;
  date: string;
  transcripts: Array<{ text: string; timestamp: string }>;
  summary?: Summary;
}

// Simple function to export summary to existing Notion page
export async function exportMeetingToNotion(
  meetingData: MeetingData,
  notionConfig: NotionConfig
): Promise<string> {
  try {
    // Format the meeting content as markdown
    const markdownContent = formatMeetingAsMarkdown(meetingData);
    
    // Convert markdown to Notion blocks using markdownToBlocks
    const contentInBlocks = markdownToBlocks(markdownContent);
    
    // Use the same pattern as updateInNotion from the provided code
    console.log("Updating in Notion");

    if (contentInBlocks.length > 100) {
        contentInBlocks.splice(0, 100);
        console.log("there are >100 blocks and I haven't yet made the logic for this");
    }

    // Use Tauri's HTTP client
    const { fetch } = await import('@tauri-apps/plugin-http');

    const response = await fetch(`https://api.notion.com/v1/blocks/${notionConfig.pageId}/children`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${notionConfig.apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        children: contentInBlocks
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Notion API error: ${errorData.message || response.statusText}`);
    }

    return `https://notion.so/${notionConfig.pageId}`;
  } catch (error) {
    console.error('Failed to export meeting to Notion:', error);
    throw new Error(`Failed to export meeting to Notion: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function formatMeetingAsMarkdown(meetingData: MeetingData): string {
  let markdown = `# ${meetingData.title}\n\n`;
  markdown += `**Date:** ${new Date(meetingData.date).toLocaleDateString()}\n`;
  markdown += `**Meeting ID:** ${meetingData.id}\n\n`;

  // Add summary if available
  if (meetingData.summary) {
    markdown += `## Summary\n\n`;
    
    Object.entries(meetingData.summary).forEach(([key, section]) => {
      markdown += `### ${section.title}\n\n`;
      section.blocks.forEach(block => {
        markdown += `- ${block.content}\n`;
      });
      markdown += `\n`;
    });
  }

  // Only add transcript section if there are transcripts
  if (meetingData.transcripts && meetingData.transcripts.length > 0) {
    markdown += `## Transcript\n\n`;
    meetingData.transcripts.forEach(transcript => {
      const timestamp = new Date(transcript.timestamp).toLocaleTimeString();
      markdown += `**[${timestamp}]** ${transcript.text}\n\n`;
    });
  }

  return markdown;
}