import { NextRequest, NextResponse } from 'next/server';
import { ApiHandler, ApiHandlerOptions } from '@/types/api';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


export function createApiHandler<T>(
  handler: ApiHandler<T>,
  options: ApiHandlerOptions = {}
) {
  return async (req: NextRequest, context: { params: Record<string, string> }) => {
    // Check allowed methods
    if (options.allowedMethods && !options.allowedMethods.includes(req.method)) {
      return NextResponse.json(
        { error: `Method ${req.method} not allowed` }, 
        { status: 405 }
      );
    }

    try {
      // Parse search parameters
      const searchParams = req.nextUrl.searchParams;
      const apiContext = { params: context.params, searchParams };
      
      // Execute the handler
      const result = await handler(req, apiContext, prisma);
      return NextResponse.json(result);
    } catch (error) {
      console.error(`API error:`, error);
      const message = error instanceof Error ? error.message : 'Operation failed';
      return NextResponse.json(
        { error: message }, 
        { status: 500 }
      );
    }
  };
}