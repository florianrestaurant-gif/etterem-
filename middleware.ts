import { NextResponse } from "next/server";

// Kötelező export – akár üresen is mehet
export function middleware() {
  return NextResponse.next();
}

// NE fogja meg az /api-t!
export const config = {
  matcher: ["/dashboard/:path*", "/menus/:path*", "/welcome"],
};
