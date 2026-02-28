import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { password, next } = body;

        const correctPassword = process.env.AGENT_UI_PASSWORD;

        if (!correctPassword) {
            return NextResponse.json(
                { error: "Configuration Error: AGENT_UI_PASSWORD is not set on server." },
                { status: 500 }
            );
        }

        if (password !== correctPassword) {
            return NextResponse.json(
                { error: "Invalid password" },
                { status: 401 }
            );
        }

        // Create success response and redirect if needed
        const nextUrl = next && next.startsWith('/') ? next : '/agent';

        const response = NextResponse.json({ success: true, redirect: nextUrl });

        // Set secure cookie
        response.cookies.set('agent_ui', '1', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7 // 7 days
        });

        return response;

    } catch (e) {
        return NextResponse.json(
            { error: "Bad request" },
            { status: 400 }
        );
    }
}
