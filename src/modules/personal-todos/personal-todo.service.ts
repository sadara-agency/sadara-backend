import { Op } from "sequelize";
import { sequelize } from "@config/database";
import PersonalTodo from "./personal-todo.model";
import { AppError } from "@middleware/errorHandler";
import type {
  CreatePersonalTodoDTO,
  UpdatePersonalTodoDTO,
  PersonalTodoQuery,
  ReorderPersonalTodosDTO,
} from "./personal-todo.validation";

export async function listPersonalTodos(
  userId: string,
  query: PersonalTodoQuery,
) {
  const { page, limit, isDone, priority, tag, dueBefore, dueAfter } = query;
  const offset = (page - 1) * limit;

  const where: Record<string, unknown> = { userId };

  if (isDone !== undefined) {
    where.isDone = isDone === "true";
  }

  if (priority) {
    where.priority = priority;
  }

  if (tag) {
    where.tags = { [Op.contains]: [tag] };
  }

  if (dueBefore || dueAfter) {
    const dueDateWhere: Record<symbol, unknown> = {};
    if (dueBefore) dueDateWhere[Op.lte] = dueBefore;
    if (dueAfter) dueDateWhere[Op.gte] = dueAfter;
    where.dueDate = dueDateWhere;
  }

  const { rows, count } = await PersonalTodo.findAndCountAll({
    where,
    limit,
    offset,
    order: [
      ["isDone", "ASC"],
      ["sortOrder", "ASC"],
      ["dueDate", "ASC NULLS LAST"],
      ["createdAt", "ASC"],
    ],
  });

  return {
    data: rows,
    meta: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}

export async function getPersonalTodoById(id: string, userId: string) {
  const todo = await PersonalTodo.findOne({ where: { id, userId } });
  if (!todo) throw new AppError("Todo not found", 404);
  return todo;
}

export async function createPersonalTodo(
  data: CreatePersonalTodoDTO,
  userId: string,
) {
  const maxOrder = await PersonalTodo.max<number, PersonalTodo>("sortOrder", {
    where: { userId, isDone: false },
  });
  const sortOrder = typeof maxOrder === "number" ? maxOrder + 1 : 0;
  return PersonalTodo.create({ ...data, userId, sortOrder });
}

export async function updatePersonalTodo(
  id: string,
  data: UpdatePersonalTodoDTO,
  userId: string,
) {
  const todo = await getPersonalTodoById(id, userId);

  const updates: Partial<typeof data & { completedAt: Date | null }> = {
    ...data,
  };

  if (data.isDone === true && !todo.isDone) {
    updates.completedAt = new Date();
  } else if (data.isDone === false && todo.isDone) {
    updates.completedAt = null;
  }

  return todo.update(updates);
}

export async function deletePersonalTodo(id: string, userId: string) {
  const todo = await getPersonalTodoById(id, userId);
  await todo.destroy();
  return { id };
}

export async function reorderPersonalTodos(
  items: ReorderPersonalTodosDTO["items"],
  userId: string,
) {
  // Verify ownership of all IDs, then bulk update in a transaction
  const ids = items.map((i) => i.id);
  const owned = await PersonalTodo.count({ where: { id: ids, userId } });
  if (owned !== ids.length)
    throw new AppError("One or more todos not found", 404);

  await sequelize.transaction(async (t) => {
    await Promise.all(
      items.map(({ id, sortOrder }) =>
        PersonalTodo.update(
          { sortOrder },
          { where: { id, userId }, transaction: t },
        ),
      ),
    );
  });

  return { updated: ids.length };
}
