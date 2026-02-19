import { Op } from 'sequelize';
import { Document } from './document.model';
import { Player } from '../players/player.model';
import { User } from '../Users/user.model';
import { AppError } from '../../middleware/errorHandler';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';

const PLAYER_ATTRS = ['id', 'firstName', 'lastName', 'firstNameAr', 'lastNameAr', 'photoUrl'] as const;
const USER_ATTRS = ['id', 'fullName'] as const;

export async function listDocuments(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(queryParams, 'createdAt');
  const where: any = {};
  if (queryParams.type) where.type = queryParams.type;
  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.playerId) where.playerId = queryParams.playerId;
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { notes: { [Op.iLike]: `%${search}%` } },
      { '$player.first_name$': { [Op.iLike]: `%${search}%` } },
      { '$player.last_name$': { [Op.iLike]: `%${search}%` } },
    ];
  }
  const { count, rows } = await Document.findAndCountAll({
    where, limit, offset, order: [[sort, order]], subQuery: false,
    include: [
      { model: Player, as: 'player', attributes: [...PLAYER_ATTRS] },
      { model: User, as: 'uploader', attributes: [...USER_ATTRS] },
    ],
  });
  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getDocumentById(id: string) {
  const doc = await Document.findByPk(id, {
    include: [
      { model: Player, as: 'player', attributes: [...PLAYER_ATTRS] },
      { model: User, as: 'uploader', attributes: [...USER_ATTRS] },
    ],
  });
  if (!doc) throw new AppError('Document not found', 404);
  return doc;
}

export async function createDocument(input: any, userId: string) {
  if (input.playerId) {
    const player = await Player.findByPk(input.playerId);
    if (!player) throw new AppError('Player not found', 404);
  }
  return await Document.create({ ...input, uploadedBy: userId });
}

export async function updateDocument(id: string, input: any) {
  const doc = await Document.findByPk(id);
  if (!doc) throw new AppError('Document not found', 404);
  return await doc.update(input);
}

export async function deleteDocument(id: string) {
  const doc = await Document.findByPk(id);
  if (!doc) throw new AppError('Document not found', 404);
  await doc.destroy();
  return { id };
}