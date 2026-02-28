import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    // Redirect to login page
    const url = req.nextUrl.clone();
    url.pathname = '/agent/login';
    url.searchParams.delete('next');

    const response = NextResponse.redirect(url);

    // Clear cookies
    response.cookies.set('agent_ui', '', {
        maxAge: 0,
        path: '/'
    });

    return response;
}

export async function POST(req: NextRequest) {
    return GET(req);
}
