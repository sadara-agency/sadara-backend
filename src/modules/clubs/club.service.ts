import { query } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';

export async function listClubs(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(queryParams, 'name');

  const conditions: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (queryParams.type) { conditions.push(`type = $${idx++}`); values.push(queryParams.type); }
  if (queryParams.country) { conditions.push(`country ILIKE $${idx++}`); values.push(`%${queryParams.country}%`); }
  if (search) {
    conditions.push(`(name ILIKE $${idx} OR name_ar ILIKE $${idx} OR city ILIKE $${idx})`);
    values.push(`%${search}%`); idx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const allowedSorts: Record<string, string> = { name: 'name', created_at: 'created_at', city: 'city', country: 'country' };
  const sortCol = allowedSorts[sort] || 'name';

  const countResult = await query(`SELECT COUNT(*) FROM clubs ${whereClause}`, values);
  const total = parseInt(countResult.rows[0].count, 10);

  const dataValues = [...values, limit, offset];
  const result = await query(
    `SELECT c.*,
       (SELECT COUNT(*) FROM players p WHERE p.current_club_id = c.id) AS player_count,
       (SELECT COUNT(*) FROM contracts ct WHERE ct.club_id = c.id AND ct.status = 'Active') AS active_contracts
     FROM clubs c ${whereClause}
     ORDER BY ${sortCol} ${order}
     LIMIT $${idx++} OFFSET $${idx}`,
    dataValues
  );

  return { data: result.rows, meta: buildMeta(total, page, limit) };
}

export async function getClubById(id: string) {
  const result = await query(
    `SELECT c.*, (SELECT COUNT(*) FROM players p WHERE p.current_club_id = c.id) AS player_count
     FROM clubs c WHERE c.id = $1`, [id]
  );
  if (result.rows.length === 0) throw new AppError('Club not found', 404);

  const contacts = await query(`SELECT * FROM contacts WHERE club_id = $1 ORDER BY is_primary DESC`, [id]);
  return { ...result.rows[0], contacts: contacts.rows };
}

export async function createClub(input: any) {
  const result = await query(
    `INSERT INTO clubs (name, name_ar, type, country, city, league, logo_url, website, founded_year, stadium, stadium_capacity, primary_color, secondary_color, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [input.name, input.nameAr, input.type, input.country, input.city, input.league, input.logoUrl, input.website,
     input.foundedYear, input.stadium, input.stadiumCapacity, input.primaryColor, input.secondaryColor, input.notes]
  );
  return result.rows[0];
}

export async function updateClub(id: string, input: any) {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  const map: Record<string, string> = {
    name:'name', nameAr:'name_ar', type:'type', country:'country', city:'city', league:'league',
    logoUrl:'logo_url', website:'website', foundedYear:'founded_year', stadium:'stadium',
    stadiumCapacity:'stadium_capacity', primaryColor:'primary_color', secondaryColor:'secondary_color', notes:'notes',
  };
  for (const [key, val] of Object.entries(input)) {
    if (val !== undefined && map[key]) { fields.push(`${map[key]} = $${idx++}`); values.push(val); }
  }
  if (fields.length === 0) throw new AppError('No fields to update');
  values.push(id);
  const result = await query(`UPDATE clubs SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);
  if (result.rows.length === 0) throw new AppError('Club not found', 404);
  return result.rows[0];
}

export async function deleteClub(id: string) {
  const result = await query('DELETE FROM clubs WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) throw new AppError('Club not found', 404);
  return { id };
}
