import { NotFoundException } from '@nestjs/common';
import { NotesService } from './notes.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NotesService', () => {
  let prisma: jest.Mocked<Pick<PrismaService, 'note'>>;
  let service: NotesService;

  beforeEach(() => {
    prisma = {
      note: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      } as unknown as PrismaService['note'],
    };

    service = new NotesService(prisma as unknown as PrismaService);
  });

  it('creates a note owned by the given user', async () => {
    (prisma.note.create as jest.Mock).mockResolvedValue({
      id: 'note-1',
      title: 't',
      content: 'c',
      userId: 'user-1',
    });

    const result = await service.create('user-1', { title: 't', content: 'c' });

    expect(prisma.note.create).toHaveBeenCalledWith({
      data: { title: 't', content: 'c', userId: 'user-1' },
    });
    expect(result).toEqual({
      id: 'note-1',
      title: 't',
      content: 'c',
      userId: 'user-1',
    });
  });

  it("lists only the requesting user's notes", async () => {
    (prisma.note.findMany as jest.Mock).mockResolvedValue([]);

    await service.findAll('user-1');

    expect(prisma.note.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    );
  });

  it('returns a note the user owns', async () => {
    (prisma.note.findUnique as jest.Mock).mockResolvedValue({
      id: 'note-1',
      userId: 'user-1',
    });

    const result = await service.findOne('user-1', 'note-1');

    expect(result).toEqual({ id: 'note-1', userId: 'user-1' });
  });

  it('throws NotFoundException for a note owned by someone else', async () => {
    (prisma.note.findUnique as jest.Mock).mockResolvedValue({
      id: 'note-1',
      userId: 'someone-else',
    });

    await expect(service.findOne('user-1', 'note-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws NotFoundException for a note that does not exist', async () => {
    (prisma.note.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.findOne('user-1', 'missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updates a note only after confirming ownership', async () => {
    (prisma.note.findUnique as jest.Mock).mockResolvedValue({
      id: 'note-1',
      userId: 'user-1',
    });
    (prisma.note.update as jest.Mock).mockResolvedValue({
      id: 'note-1',
      title: 'updated',
    });

    const result = await service.update('user-1', 'note-1', {
      title: 'updated',
    });

    expect(result).toEqual({ id: 'note-1', title: 'updated' });
  });

  it('deletes a note only after confirming ownership', async () => {
    (prisma.note.findUnique as jest.Mock).mockResolvedValue({
      id: 'note-1',
      userId: 'user-1',
    });

    const result = await service.remove('user-1', 'note-1');

    expect(prisma.note.delete).toHaveBeenCalledWith({
      where: { id: 'note-1' },
    });
    expect(result).toEqual({ deleted: true });
  });
});
