let emailService;
let nodemailer;

beforeEach(() => {
  jest.resetModules();

  jest.mock("nodemailer", () => {
    const mockTransporter = {
      sendMail: jest.fn().mockResolvedValue("info"),
    };
    return {
      createTransport: jest.fn(() => mockTransporter),
      createTestAccount: jest
        .fn()
        .mockResolvedValue({ user: "test", pass: "test" }),
      getTestMessageUrl: jest.fn().mockReturnValue("http://test.url"),
    };
  });

  jest.mock("../../utils/logger", () => ({
    info: jest.fn(),
    error: jest.fn(),
  }));

  jest.mock("../../config", () => ({
    app: { isDev: false },
    email: {
      host: "smtp.test.com",
      port: 587,
      user: "testuser",
      pass: "testpass",
      from: "noreply@test.local",
    },
  }));

  nodemailer = require("nodemailer");
  emailService = require("../../services/email");
});

describe("Email Service", () => {
  describe("sendConfirmationEmail", () => {
    it("Given recipient data, When sendConfirmationEmail is called, Then calls sendMail with correct to address and subject", async () => {
      const email = "user@example.com";
      const repo = "owner/repo";
      const token = "token123";

      await emailService.sendConfirmationEmail(email, repo, token);

      const mockSendMail = nodemailer.createTransport().sendMail;
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@example.com",
          subject: "Confirm your subscription to owner/repo",
          from: "noreply@test.local",
        }),
      );
      expect(mockSendMail.mock.calls[0][0].text).toContain("token123");
    });
  });

  describe("sendNewReleaseEmail", () => {
    it("Given release data, When sendNewReleaseEmail is called, Then calls sendMail with bcc array and correct tag in subject", async () => {
      const emails = ["user1@example.com", "user2@example.com"];
      const repo = "owner/repo";
      const tag = "v2.0.0";

      await emailService.sendNewReleaseEmail(emails, repo, tag);

      const mockSendMail = nodemailer.createTransport().sendMail;
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "noreply@test.local",
          bcc: ["user1@example.com", "user2@example.com"],
          subject: "New Release: owner/repo v2.0.0",
        }),
      );
      expect(mockSendMail.mock.calls[0][0].text).toContain("v2.0.0");
    });
  });

  describe("Transporter Initialization", () => {
    it("Given multiple email send requests, When emails are sent sequentially, Then createTransport is called exactly once", async () => {
      await emailService.sendConfirmationEmail(
        "test1@example.com",
        "repo1",
        "token1",
      );
      await emailService.sendNewReleaseEmail(
        ["test2@example.com"],
        "repo2",
        "v1.0",
      );
      await emailService.sendConfirmationEmail(
        "test3@example.com",
        "repo3",
        "token2",
      );

      expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
    });

    it("Given multiple concurrent email send requests, When emails are sent simultaneously, Then createTransport is called exactly once", async () => {
      await Promise.all([
        emailService.sendConfirmationEmail(
          "test1@example.com",
          "repo1",
          "token1",
        ),
        emailService.sendNewReleaseEmail(
          ["test2@example.com"],
          "repo2",
          "v1.0",
        ),
        emailService.sendConfirmationEmail(
          "test3@example.com",
          "repo3",
          "token2",
        ),
      ]);

      expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
    });
  });
});
