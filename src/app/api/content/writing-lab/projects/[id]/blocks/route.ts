import { NextResponse } from "next/server";
import { db } from "@/db/db";
import crypto from "crypto";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Using COALESCE for backward compatibility
    const blocks = db.prepare(`
      SELECT 
        id,
        COALESCE(writing_project_id, project_id) as writing_project_id,
        COALESCE(block_type, type) as block_type,
        label,
        placeholder,
        COALESCE(content_md, content) as content_md,
        sort_order,
        created_at,
        updated_at
      FROM gf_writing_blocks 
      WHERE writing_project_id = ? OR project_id = ?
      ORDER BY sort_order ASC
    `).all(id, id);
    return NextResponse.json(blocks);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Deriving writing_mode from the project itself instead of relying on body
    const project = db.prepare("SELECT writing_mode FROM gf_writing_projects WHERE id = ?").get(id) as any;
    
    if (!project) {
      console.log(`[Initialize Blocks] Project not found: ${id}`);
      return NextResponse.json({ error: `Writing project not found: ${id}` }, { status: 404 });
    }

    const mode = project.writing_mode;
    
    // Templates
    const templates: Record<string, { label: string; placeholder: string }[]> = {
      knowledge_article: [
        { label: "Title / Working Title", placeholder: "Enter a compelling title..." },
        { label: "Excerpt", placeholder: "Brief summary for readers..." },
        { label: "Opening / Introduction", placeholder: "Hook the reader..." },
        { label: "What it is", placeholder: "Define the core concept..." },
        { label: "How it works", placeholder: "Explain the mechanism..." },
        { label: "System Context", placeholder: "How it fits into the bigger picture..." },
        { label: "Practical Meaning", placeholder: "Why it matters to the user..." },
        { label: "Caution / Claim Guardrail", placeholder: "What to watch out for..." },
        { label: "Summary", placeholder: "Key takeaways..." },
        { label: "Read More / Bridge", placeholder: "Next steps or related topics..." },
        { label: "FAQ Notes", placeholder: "Common questions..." },
        { label: "References Notes", placeholder: "Sources and further reading..." }
      ],
      knowledge_journey_article: [
        { label: "Opening Scene", placeholder: "Set the stage..." },
        { label: "Main Question", placeholder: "What journey are we taking?" },
        { label: "Stage 1", placeholder: "First step..." },
        { label: "Stage 2", placeholder: "Second step..." },
        { label: "Stage 3", placeholder: "Third step..." },
        { label: "Stage 4", placeholder: "Final step..." },
        { label: "System View", placeholder: "The eagle-eye perspective..." },
        { label: "Practical Meaning", placeholder: "Application in life..." },
        { label: "Caution", placeholder: "Warnings..." },
        { label: "Closing Bridge", placeholder: "Wrapping up..." }
      ],
      documentary_chapter: [
        { label: "Opening Image", placeholder: "Visual hook..." },
        { label: "Environmental Context", placeholder: "The setting..." },
        { label: "Scientific Concept", placeholder: "The core truth..." },
        { label: "Journey Movement", placeholder: "How things change..." },
        { label: "Human Meaning", placeholder: "The emotional connection..." },
        { label: "Quiet Reflection", placeholder: "A moment to think..." },
        { label: "Bridge to Next Chapter", placeholder: "The hook for later..." }
      ],
      writers_journal: [
        { label: "Moment", placeholder: "When and where?" },
        { label: "Observation", placeholder: "What did you see/hear?" },
        { label: "Connection", placeholder: "What does it remind you of?" },
        { label: "Insight", placeholder: "The 'Aha!' moment..." },
        { label: "Soft Closing", placeholder: "A gentle end..." }
      ],
      social_story_copy: [
        { label: "Facebook Group Post", placeholder: "Tailored for community engagement..." },
        { label: "Facebook Page Post", placeholder: "Tailored for broad reach..." },
        { label: "Personal Profile Post", placeholder: "Tailored for personal connection..." },
        { label: "Short Caption", placeholder: "For Instagram/TikTok style..." },
        { label: "Hashtags", placeholder: "#topic #insight..." }
      ]
    };

    const blocksToCreate = templates[mode] || [];
    
    // Check if blocks already exist (using both columns for compatibility)
    const existingCount = db.prepare(`
      SELECT count(*) as count FROM gf_writing_blocks 
      WHERE writing_project_id = ? OR project_id = ?
    `).get(id, id) as any;
    
    if (existingCount.count > 0) {
      // If already initialized, return them
      const blocks = db.prepare(`
        SELECT 
          id,
          COALESCE(writing_project_id, project_id) as writing_project_id,
          COALESCE(block_type, type) as block_type,
          label,
          placeholder,
          COALESCE(content_md, content) as content_md,
          sort_order,
          created_at,
          updated_at
        FROM gf_writing_blocks 
        WHERE writing_project_id = ? OR project_id = ?
        ORDER BY sort_order ASC
      `).all(id, id);
      return NextResponse.json(blocks);
    }

    // Inserting into BOTH old and new columns to satisfy NOT NULL constraints
    const insert = db.prepare(`
      INSERT INTO gf_writing_blocks (
        id, project_id, writing_project_id, 
        type, block_type, 
        label, placeholder, 
        content, content_md, 
        sort_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((blocks) => {
      blocks.forEach((b: any, index: number) => {
        const blkId = `BLK-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
        insert.run(blkId, id, id, "text", "text", b.label, b.placeholder, "", "", index);
      });
    });

    transaction(blocksToCreate);

    // Fetch and return the newly created blocks
    const newBlocks = db.prepare(`
      SELECT 
        id,
        COALESCE(writing_project_id, project_id) as writing_project_id,
        COALESCE(block_type, type) as block_type,
        label,
        placeholder,
        COALESCE(content_md, content) as content_md,
        sort_order,
        created_at,
        updated_at
      FROM gf_writing_blocks 
      WHERE writing_project_id = ? OR project_id = ?
      ORDER BY sort_order ASC
    `).all(id, id);

    return NextResponse.json(newBlocks);
  } catch (error: any) {
    console.error("Initialize blocks failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { blocks } = await req.json();
    
    // Updating BOTH old and new columns for consistency
    const update = db.prepare(`
      UPDATE gf_writing_blocks 
      SET content = ?, content_md = ?, updated_at = datetime('now')
      WHERE id = ? AND (writing_project_id = ? OR project_id = ?)
    `);

    const transaction = db.transaction((blocksToUpdate) => {
      blocksToUpdate.forEach((b: any) => {
        update.run(b.content_md, b.content_md, b.id, id, id);
      });
    });

    transaction(blocks);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
