import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
// Second generic param is the emitted-event union: without it, $on('query', ...)
// doesn't type-check even though the `log` config below enables it at runtime.
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'query'>
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // 'query' as an emitted event (not just stdout) costs nothing at rest and
    // lets tests subscribe via $on('query', ...) to count SQL statements —
    // that's how the N+1 guard tests measure query count for real.
    super({ log: [{ emit: 'event', level: 'query' }] });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
