import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { AuthenticatedUser } from '../types/authenticated-user.type';

function createMockContext(user: AuthenticatedUser): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows access when no roles are required', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(
      guard.canActivate(
        createMockContext({ id: '1', email: 'a@b.com', role: 'user' }),
      ),
    ).toBe(true);
  });

  it('allows access when the user has a required role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['admin']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(
      guard.canActivate(
        createMockContext({ id: '1', email: 'a@b.com', role: 'admin' }),
      ),
    ).toBe(true);
  });

  it('throws ForbiddenException when the user lacks a required role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['admin']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() =>
      guard.canActivate(
        createMockContext({ id: '1', email: 'a@b.com', role: 'user' }),
      ),
    ).toThrow(ForbiddenException);
  });
});
