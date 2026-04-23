export class UserService {
  constructor() {}

  async findUser(id: string) {
    return { id, name: 'Test User' };
  }
}

export const DEFAULT_USER = { id: '0', name: 'Guest' };