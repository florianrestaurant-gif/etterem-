import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // csak a konyhai részt védjük
  const protectedPaths = ["/kitchen/inventory"];

  const isProtected = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get("inventoryAuth");

  if (!cookie || cookie.value !== "ok") {
    const loginUrl = new URL("/kitchen/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// csak ezekre az útvonalakra fusson a middleware
export const config = {
  matcher: ["/kitchen/:path*"],
};
