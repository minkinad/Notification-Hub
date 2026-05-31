import { INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { RolesGuard } from '@common/guards/roles.guard';
import { JwtGuard } from '@common/guards/jwt.guard';
import { JwtUser } from '@common/types/jwt-user.interface';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let app: INestApplication;
  let usersService: { getAllUsers: jest.Mock };
  let currentUser: JwtUser;

  beforeEach(async () => {
    currentUser = {
      id: 'user-1',
      email: 'admin@example.com',
      role: Role.ADMIN,
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        RolesGuard,
        {
          provide: UsersService,
          useValue: {
            getAllUsers: jest.fn().mockResolvedValue({
              data: [],
              total: 0,
              skip: 0,
              take: 10,
            }),
          },
        },
      ],
    })
      .overrideGuard(JwtGuard)
      .useValue({
        canActivate(context: {
          switchToHttp(): { getRequest(): { user?: JwtUser } };
        }) {
          context.switchToHttp().getRequest().user = currentUser;
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.enableVersioning({
      type: VersioningType.URI,
      prefix: 'api/v',
    });
    await app.init();

    usersService = moduleRef.get(UsersService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('allows admins to list users', async () => {
    await request(app.getHttpServer()).get('/api/v1/users').expect(200).expect({
      data: [],
      total: 0,
      skip: 0,
      take: 10,
    });

    expect(usersService.getAllUsers).toHaveBeenCalledWith(0, 10);
  });

  it('rejects non-admin users', async () => {
    currentUser.role = Role.USER;

    await request(app.getHttpServer()).get('/api/v1/users').expect(403);
  });
});
