import { Plan, User } from "@prisma/client";
import { prisma } from "../lib/prisma";

export { prisma };

export interface CreateUserInput {
  id: string;
  email: string;
}

export interface UpdateSettingsInput {
  whatsapp_number?: string | null;
}

export const userService = {
  async ensureUser(input: CreateUserInput): Promise<User> {
    return prisma.user.upsert({
      where: { id: input.id },
      update: { email: input.email },
      create: {
        id: input.id,
        email: input.email,
        plan: Plan.FREE,
      },
    });
  },

  async getUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  async updateSettings(
    id: string,
    data: UpdateSettingsInput
  ): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        whatsapp_number: data.whatsapp_number ?? null,
      },
    });
  },

  async createAlert(params: {
    userId: string;
    photoUrl?: string | null;
  }): Promise<{ id: string; triggered_at: Date }> {
    const alert = await prisma.alert.create({
      data: {
        user_id: params.userId,
        intruder_photo: params.photoUrl ?? null,
      },
      select: { id: true, triggered_at: true },
    });
    return alert;
  },

  async listAlerts(userId: string, limit = 20): Promise<
    Array<{ id: string; triggered_at: Date; intruder_photo: string | null }>
  > {
    return prisma.alert.findMany({
      where: { user_id: userId },
      orderBy: { triggered_at: "desc" },
      take: limit,
      select: {
        id: true,
        triggered_at: true,
        intruder_photo: true,
      },
    });
  },
};
