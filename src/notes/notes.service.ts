import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateNoteDto) {
    return this.prisma.note.create({
      data: { title: dto.title, content: dto.content, userId },
    });
  }

  findAll(userId: string) {
    return this.prisma.note.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const note = await this.prisma.note.findUnique({ where: { id } });
    if (!note || note.userId !== userId) {
      throw new NotFoundException('Note not found');
    }
    return note;
  }

  async update(userId: string, id: string, dto: UpdateNoteDto) {
    await this.findOne(userId, id);
    return this.prisma.note.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string): Promise<{ deleted: true }> {
    await this.findOne(userId, id);
    await this.prisma.note.delete({ where: { id } });
    return { deleted: true };
  }
}
