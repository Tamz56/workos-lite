import NoteEditorClient from "./NoteEditorClient";

interface PageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
    const { id } = await params;
    return {
        title: `Editing Note | ArborDesk`,
    };
}

export default async function NoteEditorPage({ params }: PageProps) {
    const { id } = await params;
    return <NoteEditorClient id={id} />;
}
