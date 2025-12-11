import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const restaurants = await (prisma as any).restaurant.findMany();
  return NextResponse.json(restaurants);
}
