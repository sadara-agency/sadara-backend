import {
  createTaskSchema,
  updateTaskSchema,
  updateStatusSchema,
  taskQuerySchema,
} from '../../../src/modules/tasks/task.validation';

const UUID = '550e8400-e29b-41d4-a716-446655440001';

describe('Task Schemas', () => {
  describe('createTaskSchema', () => {
    it('should accept valid task', () => {
      expect(createTaskSchema.safeParse({ title: 'Review contract' }).success).toBe(true);
    });
    it('should reject empty title', () => {
      expect(createTaskSchema.safeParse({ title: '' }).success).toBe(false);
    });
    it('should default type to General', () => {
      expect(createTaskSchema.parse({ title: 'Test' }).type).toBe('General');
    });
    it('should default priority to medium', () => {
      expect(createTaskSchema.parse({ title: 'Test' }).priority).toBe('medium');
    });
    it('should reject invalid UUID for assignedTo', () => {
      expect(createTaskSchema.safeParse({ title: 'Test', assignedTo: 'bad' }).success).toBe(false);
    });
    it('should reject invalid date format', () => {
      expect(createTaskSchema.safeParse({ title: 'Test', dueDate: '15/06/2025' }).success).toBe(false);
    });
    it('should accept valid date format', () => {
      expect(createTaskSchema.safeParse({ title: 'Test', dueDate: '2025-06-15' }).success).toBe(true);
    });
  });

  describe('updateStatusSchema', () => {
    it('should accept valid status', () => {
      expect(updateStatusSchema.safeParse({ status: 'Completed' }).success).toBe(true);
    });
    it('should reject invalid status', () => {
      expect(updateStatusSchema.safeParse({ status: 'Done' }).success).toBe(false);
    });
    it('should accept all valid statuses', () => {
      for (const status of ['Open', 'InProgress', 'Completed', 'Canceled']) {
        expect(updateStatusSchema.safeParse({ status }).success).toBe(true);
      }
    });
  });

  describe('taskQuerySchema', () => {
    it('should default sort to created_at', () => {
      expect(taskQuerySchema.parse({}).sort).toBe('created_at');
    });
    it('should coerce page string', () => {
      expect(taskQuerySchema.parse({ page: '5' }).page).toBe(5);
    });
    it('should accept all filter types', () => {
      expect(taskQuerySchema.safeParse({
        status: 'Open', type: 'Match', priority: 'high',
      }).success).toBe(true);
    });
  });
});
