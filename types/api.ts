import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client'
import { FilterParams, SortParams } from './common';

const prisma = new PrismaClient()

export interface ApiContext {
  params: Record<string, string>;
  searchParams: URLSearchParams;
}

export type ApiHandler<T = any> = (
  req: NextRequest,
  context: ApiContext,
  prisma: PrismaClient
) => Promise<T>;

export interface ApiHandlerOptions {
  requireAuth?: boolean;
  allowedMethods?: string[];
}

export interface QueryOptions {
  filter?: FilterParams;
  sort?: SortParams;
  page?: number;
  pageSize?: number;
}