import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @ApiOperation({ summary: 'List all users (admin only)' })
  @Get('users')
  users() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, role: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @ApiOperation({ summary: 'List all notes with their owner (admin only)' })
  @Get('notes')
  notes() {
    // include: { user } batches the owner lookup into one extra query total
    // (not one per note) — see admin.e2e-spec.ts, which pins the measured
    // query count so this can't silently regress into N+1.
    return this.prisma.note.findMany({
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
