import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { EmailService } from '../src/users/email.service'
jest.mock("../src/users/email.service")

describe('/users', () => {
  let app: INestApplication;
  const MockedEmailService = <jest.Mock<EmailService>>EmailService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  describe('/users/verify/email (POST)', () => {
    it('should throw InvalidEmailAddressError', () => {
      return request(app.getHttpServer())
        .post("/users/verify/email")
        .set("User-Agent", "PostmanRuntime/7.26.8")
        .send({
          email: "test"
        })
        .expect(422)
        .expect({
          code: 422,
          message: "InvalidEmailAddressError: Invalid email address: test. Email should look like someone@example.com"
        });
    });
    it('should send an Email', async () => {
      await request(app.getHttpServer())
        .post("/users/verify/email")
        .set("User-Agent", "PostmanRuntime/7.26.8")
        .send({
          email: "test@test.com"
        })
        .expect(200)
        .expect({
          code: 200,
          message: "Send email successfully."
        });
      expect(MockedEmailService.mock.instances[0].sendRegisterCode)
        .toHaveBeenCalledWith("test@test.com", expect.any(String));
    });
  });

  afterAll(async () => {
    await app.close();
  })
});
