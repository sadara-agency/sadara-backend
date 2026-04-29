import { Response } from "express";
import type { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import * as svc from "./personal-todo.service";
import type { PersonalTodoQuery } from "./personal-todo.validation";

export async function list(req: AuthRequest, res: Response) {
  const result = await svc.listPersonalTodos(
    req.user!.id,
    req.query as unknown as PersonalTodoQuery,
  );
  sendPaginated(res, result.data, result.meta);
}

export async function getById(req: AuthRequest, res: Response) {
  const todo = await svc.getPersonalTodoById(req.params.id, req.user!.id);
  sendSuccess(res, todo);
}

export async function create(req: AuthRequest, res: Response) {
  const todo = await svc.createPersonalTodo(req.body, req.user!.id);
  sendCreated(res, todo, "Todo created");
}

export async function update(req: AuthRequest, res: Response) {
  const todo = await svc.updatePersonalTodo(
    req.params.id,
    req.body,
    req.user!.id,
  );
  sendSuccess(res, todo, "Todo updated");
}

export async function reorder(req: AuthRequest, res: Response) {
  const result = await svc.reorderPersonalTodos(req.body.items, req.user!.id);
  sendSuccess(res, result, "Todos reordered");
}

export async function remove(req: AuthRequest, res: Response) {
  const result = await svc.deletePersonalTodo(req.params.id, req.user!.id);
  sendSuccess(res, result, "Todo deleted");
}
