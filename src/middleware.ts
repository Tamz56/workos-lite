import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes to protect
const PROTECTED_ROUTES = [
    '/agent',
    '/agent/logs',
    '/api/agent/proxy',
    '/api/agent/logs'
]

export function middleware(request: NextRequest) {
    const { pathname: p } = request.nextUrl

    // 1. Auth Logic for protected routes
    const isProtected = PROTECTED_ROUTES.some(route =>
        p === route || p.startsWith(`${route}/`)
    )

    if (isProtected && !p.startsWith('/agent/login')) {
        const authPassword = process.env.AGENT_UI_PASSWORD
        if (!authPassword) {
            return new NextResponse(
                JSON.stringify({ error: "Configuration Error: AGENT_UI_PASSWORD is not set. Access Denied." }),
                { status: 500, headers: { 'content-type': 'application/json' } }
            )
        }

        const hasAccess = request.cookies.get('agent_ui')?.value === '1'
        if (!hasAccess) {
            if (p.startsWith('/api/')) {
                return new NextResponse(
                    JSON.stringify({ error: "Unauthorized access" }),
                    { status: 401, headers: { 'content-type': 'application/json' } }
                )
            }
            const url = request.nextUrl.clone()
            url.pathname = '/agent/login'
            url.searchParams.set('next', p)
            return NextResponse.redirect(url)
        }
    }

    const res = NextResponse.next()

    // 2. Cache-Control Logic
    if (
        p.startsWith("/_next/static") ||
        p.startsWith("/_next/image") ||
        p === "/favicon.ico" ||
        p.startsWith("/icons") ||
        p.startsWith("/assets")
    ) {
        return res;
    }

    // HTML / app pages: never cache
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
}

export const config = {
    matcher: [
        '/:path*'
    ]
}
