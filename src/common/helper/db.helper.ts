import { DB_TYPE } from '../../../.secret/database.config';

export function isMySql(): boolean {
  return DB_TYPE === ('mysql' as string);
}
