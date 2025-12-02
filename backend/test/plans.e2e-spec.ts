import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { MongooseModule } from '@nestjs/mongoose';

describe('Plans API (e2e)', () =\u003e {
  let app: INestApplication;

  beforeAll(async () =\u003e {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () =\u003e {
    await app.close();
  });

  describe('/api/plans/generate (POST)', () =\u003e {
    it('should generate a new plan', () =\u003e {
      const createPlanDto = {
        projectId: 'test-proj',
        userId: 'test-user',
        wizardData: {
          stage1: {
            projectName: 'E2E Test Project',
            description: 'Testing plan generation',
          },
          stage2: {
            target_users: 'Developers',
            main_features: 'API, Dashboard',
            scalability: '100-1000',
            integrations: 'Stripe',
            auth_requirements: 'Email/Password',
          },
          stage3: {
            selectedArchetypes: ['auth-jwt-stateless'],
          },
        },
      };

      return request(app.getHttpServer())
        .post('/api/plans/generate')
        .send(createPlanDto)
        .expect(201)
        .expect((res) =\u003e {
          expect(res.body).toHaveProperty('_id');
          expect(res.body).toHaveProperty('phases');
          expect(res.body).toHaveProperty('estimatedTime');
          expect(res.body.status).toBe('pending');
        });
    });

    it('should return 400 for invalid data', () =\u003e {
      return request(app.getHttpServer())
        .post('/api/plans/generate')
        .send({})
        .expect(400);
    });
  });

  describe('/api/plans/:id (GET)', () =\u003e {
    it('should retrieve a plan by ID', async () =\u003e {
      // First create a plan
      const createResponse = await request(app.getHttpServer())
        .post('/api/plans/generate')
        .send({
          projectId: 'test',
          userId: 'test',
          wizardData: {
            stage1: { projectName: 'Test', description: 'Test' },
            stage2: {},
            stage3: { selectedArchetypes: [] },
          },
        });

      const planId = createResponse.body._id;

      // Then retrieve it
      return request(app.getHttpServer())
        .get(\/api/plans/\\)
        .expect(200)
        .expect((res) =\u003e {
          expect(res.body._id).toBe(planId);
        });
    });
  });

  describe('/api/plans/:id (PATCH)', () =\u003e {
    it('should update plan status', async () =\u003e {
      // Create a plan first
      const createResponse = await request(app.getHttpServer())
        .post('/api/plans/generate')
        .send({
          projectId: 'test',
          userId: 'test',
          wizardData: {
            stage1: { projectName: 'Test', description: 'Test' },
            stage2: {},
            stage3: { selectedArchetypes: [] },
          },
        });

      const planId = createResponse.body._id;

      // Update status
      return request(app.getHttpServer())
        .patch(\/api/plans/\\)
        .send({ status: 'in_progress' })
        .expect(200)
        .expect((res) =\u003e {
          expect(res.body.status).toBe('in_progress');
        });
    });
  });
});
