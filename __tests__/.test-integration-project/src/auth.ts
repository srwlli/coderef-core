export function authenticateUser(username: string, password: string) {
  return validateCredentials(username, password);
}

function validateCredentials(username: string, password: string) {
  return username.length > 0 && password.length > 8;
}

export class AuthService {
  async login(username: string, password: string) {
    return authenticateUser(username, password);
  }
}