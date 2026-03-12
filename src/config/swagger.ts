import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import type { Express } from "express";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Sadara API",
      version: "1.0.0",
      description:
        "REST API for the Sadara Player Management Platform — contracts, matches, finance, scouting, and more.",
    },
    servers: [{ url: "/api/v1", description: "API v1" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        PaginationMeta: {
          type: "object",
          properties: {
            page: { type: "integer" },
            limit: { type: "integer" },
            total: { type: "integer" },
            totalPages: { type: "integer" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
            errors: { type: "array", items: { type: "object" } },
          },
        },
        Player: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            firstNameAr: { type: "string" },
            lastNameAr: { type: "string" },
            dateOfBirth: { type: "string", format: "date" },
            nationality: { type: "string" },
            secondaryNationality: { type: "string" },
            playerType: { type: "string", enum: ["Pro", "Youth"] },
            position: { type: "string" },
            secondaryPosition: { type: "string" },
            preferredFoot: { type: "string", enum: ["Left", "Right", "Both"] },
            heightCm: { type: "number" },
            weightKg: { type: "number" },
            jerseyNumber: { type: "integer" },
            currentClubId: { type: "string", format: "uuid" },
            marketValue: { type: "number" },
            marketValueCurrency: {
              type: "string",
              enum: ["SAR", "USD", "EUR"],
            },
            email: { type: "string", format: "email" },
            phone: { type: "string" },
            photoUrl: { type: "string" },
            status: { type: "string" },
            notes: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Contract: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            playerId: { type: "string", format: "uuid" },
            clubId: { type: "string", format: "uuid" },
            category: { type: "string", enum: ["Club", "Sponsorship"] },
            contractType: {
              type: "string",
              enum: [
                "Representation",
                "CareerManagement",
                "Transfer",
                "Loan",
                "Renewal",
                "Sponsorship",
                "ImageRights",
                "MedicalAuth",
              ],
            },
            title: { type: "string" },
            status: { type: "string" },
            startDate: { type: "string", format: "date" },
            endDate: { type: "string", format: "date" },
            baseSalary: { type: "number" },
            salaryCurrency: { type: "string", enum: ["SAR", "USD", "EUR"] },
            signingBonus: { type: "number" },
            releaseClause: { type: "number" },
            performanceBonus: { type: "number" },
            commissionPct: { type: "number" },
            exclusivity: {
              type: "string",
              enum: ["Exclusive", "NonExclusive"],
            },
            notes: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Match: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            homeClubId: { type: "string", format: "uuid" },
            awayClubId: { type: "string", format: "uuid" },
            competition: { type: "string" },
            season: { type: "string" },
            matchDate: { type: "string", format: "date-time" },
            venue: { type: "string" },
            status: {
              type: "string",
              enum: ["upcoming", "live", "completed", "cancelled"],
            },
            homeScore: { type: "integer" },
            awayScore: { type: "integer" },
            attendance: { type: "integer" },
            referee: { type: "string" },
            notes: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Injury: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            playerId: { type: "string", format: "uuid" },
            matchId: { type: "string", format: "uuid" },
            injuryType: { type: "string" },
            bodyPart: { type: "string" },
            severity: {
              type: "string",
              enum: ["Minor", "Moderate", "Severe", "Critical"],
            },
            cause: {
              type: "string",
              enum: ["Training", "Match", "NonFootball", "Unknown"],
            },
            status: {
              type: "string",
              enum: ["UnderTreatment", "Recovered", "Relapsed", "Chronic"],
            },
            injuryDate: { type: "string", format: "date" },
            expectedReturnDate: { type: "string", format: "date" },
            actualReturnDate: { type: "string", format: "date" },
            diagnosis: { type: "string" },
            treatmentPlan: { type: "string" },
            isSurgeryRequired: { type: "boolean" },
            notes: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Invoice: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            contractId: { type: "string", format: "uuid" },
            playerId: { type: "string", format: "uuid" },
            clubId: { type: "string", format: "uuid" },
            amount: { type: "number" },
            taxAmount: { type: "number" },
            totalAmount: { type: "number" },
            currency: { type: "string" },
            status: {
              type: "string",
              enum: ["Paid", "Expected", "Overdue", "Cancelled"],
            },
            dueDate: { type: "string", format: "date" },
            issueDate: { type: "string", format: "date" },
            description: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Payment: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            invoiceId: { type: "string", format: "uuid" },
            playerId: { type: "string", format: "uuid" },
            amount: { type: "number" },
            currency: { type: "string" },
            paymentType: {
              type: "string",
              enum: ["Commission", "Sponsorship", "Bonus"],
            },
            status: {
              type: "string",
              enum: ["Paid", "Expected", "Overdue", "Cancelled"],
            },
            dueDate: { type: "string", format: "date" },
            paidDate: { type: "string", format: "date" },
            reference: { type: "string" },
            notes: { type: "string" },
          },
        },
        Offer: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            playerId: { type: "string", format: "uuid" },
            fromClubId: { type: "string", format: "uuid" },
            toClubId: { type: "string", format: "uuid" },
            offerType: { type: "string", enum: ["Transfer", "Loan"] },
            status: {
              type: "string",
              enum: ["New", "Under Review", "Negotiation", "Closed"],
            },
            transferFee: { type: "number" },
            salaryOffered: { type: "number" },
            contractYears: { type: "integer" },
            agentFee: { type: "number" },
            feeCurrency: { type: "string", enum: ["SAR", "USD", "EUR"] },
            deadline: { type: "string", format: "date" },
            notes: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/modules/**/*.swagger.ts", "./src/modules/**/*.swagger.docs.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "Sadara API Docs",
    }),
  );

  // Raw JSON spec
  app.get("/api/docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
}
