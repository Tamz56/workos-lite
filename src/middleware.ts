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
    const { pathname } = request.nextUrl

    // Skip if not a protected route
    const isProtected = PROTECTED_ROUTES.some(route =>
        pathname === route || pathname.startsWith(`${route}/`)
    )

    if (!isProtected || pathname.startsWith('/agent/login')) {
        return NextResponse.next()
    }

    // Fail-secure: If AGENT_UI_PASSWORD is not set, block access entirely
    const authPassword = process.env.AGENT_UI_PASSWORD
    if (!authPassword) {
        return new NextResponse(
            JSON.stringify({ error: "Configuration Error: AGENT_UI_PASSWORD is not set. Access Denied." }),
            { status: 500, headers: { 'content-type': 'application/json' } }
        )
    }

    // Check cookie
    const hasAccess = request.cookies.get('agent_ui')?.value === '1'

    if (!hasAccess) {
        // For API routes, return 401 Unauthorized
        if (pathname.startsWith('/api/')) {
            return new NextResponse(
                JSON.stringify({ error: "Unauthorized access" }),
                { status: 401, headers: { 'content-type': 'application/json' } }
            )
        }

        // For UI routes, redirect to login with the callback URL
        const url = request.nextUrl.clone()
        url.pathname = '/agent/login'
        url.searchParams.set('next', pathname)
        return NextResponse.redirect(url)
    }

    return NextResponse.next()
}

// Config ensures middleware only runs on matched paths
export const config = {
    matcher: [
        '/agent/:path*',
        '/api/agent/:path*'
    ]
}
