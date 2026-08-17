// web/lib/mfa.ts
// Verificación en dos pasos (TOTP — app autenticadora tipo Google
// Authenticator/Authy) para cuentas de administrador de NormaLis.
//
// Requiere que el proyecto de Firebase tenga Identity Platform habilitado
// con el proveedor TOTP activo (Authentication → Settings → habilitar
// autenticación multifactor → agregar TOTP). Sin ese paso de configuración
// en la consola, `iniciarEnrolamientoTotp` lanza un error de Firebase
// (auth/operation-not-allowed) — ver el mensaje entregado a Fernando con
// el paso a paso exacto de consola.
//
// Solo se exige para usuarios con rol === 'admin' (ver web/lib/auth.ts) —
// clientes y pilotos de NormaLis no se ven afectados por este módulo.
// No usa SMS: TOTP no tiene costo por verificación, a diferencia del
// segundo factor por SMS de Firebase.

import {
  multiFactor,
  TotpMultiFactorGenerator,
  getMultiFactorResolver,
  type TotpSecret,
  type MultiFactorResolver,
  type MultiFactorError,
  type User,
  type UserCredential,
} from 'firebase/auth';
import QRCode from 'qrcode';

export const NOMBRE_EMISOR = 'NormaLis';

export interface EnrolamientoTotp {
  secret: TotpSecret;
  /** Data URL (PNG) del QR — se genera y renderiza enteramente en el
   *  cliente; el secreto nunca sale del navegador hacia un servicio externo. */
  qrCodeDataUrl: string;
  /** Clave para entrada manual, por si el usuario no puede escanear el QR. */
  secretKey: string;
}

/** true si el error lanzado por un intento de login requiere completar un segundo factor. */
export function esErrorMfaRequerido(err: unknown): err is MultiFactorError {
  return (
    !!err &&
    typeof err === 'object' &&
    'code' in err &&
    (err as { code?: unknown }).code === 'auth/multi-factor-auth-required'
  );
}

/** true si el usuario ya tiene al menos un segundo factor TOTP enrolado. */
export function tieneTotpEnrolado(user: User): boolean {
  return multiFactor(user).enrolledFactors.some(
    f => f.factorId === TotpMultiFactorGenerator.FACTOR_ID,
  );
}

/**
 * Inicia el enrolamiento TOTP para un usuario recién autenticado. Firebase
 * exige que la sesión sea "reciente" (el usuario acaba de iniciar sesión con
 * su contraseña) — por eso este flujo se dispara justo después de
 * signInWithEmailAndPassword y nunca sobre una sesión vieja restaurada del
 * almacenamiento local; si ha pasado demasiado tiempo, Firebase lanza
 * auth/requires-recent-login y el usuario debe volver a iniciar sesión.
 */
export async function iniciarEnrolamientoTotp(
  user: User,
  etiquetaCuenta: string,
): Promise<EnrolamientoTotp> {
  const session = await multiFactor(user).getSession();
  const secret = await TotpMultiFactorGenerator.generateSecret(session);
  const otpauthUrl = secret.generateQrCodeUrl(etiquetaCuenta, NOMBRE_EMISOR);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220 });
  return { secret, qrCodeDataUrl, secretKey: secret.secretKey };
}

/** Verifica el código de 6 dígitos de la app autenticadora y completa el enrolamiento. */
export async function confirmarEnrolamientoTotp(
  user: User,
  secret: TotpSecret,
  codigo: string,
  etiquetaFactor: string,
): Promise<void> {
  const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, codigo.trim());
  await multiFactor(user).enroll(assertion, etiquetaFactor);
}

/** Obtiene el resolver de MFA a partir del error auth/multi-factor-auth-required. */
export { getMultiFactorResolver };
export type { MultiFactorResolver, MultiFactorError };

/** Completa un inicio de sesión que Firebase interrumpió pidiendo el segundo factor TOTP. */
export async function resolverDesafioTotp(
  resolver: MultiFactorResolver,
  codigo: string,
): Promise<UserCredential> {
  const hint = resolver.hints.find(h => h.factorId === TotpMultiFactorGenerator.FACTOR_ID);
  if (!hint) {
    throw new Error('Esta cuenta no tiene un segundo factor TOTP configurado. Contacta soporte.');
  }
  const assertion = TotpMultiFactorGenerator.assertionForSignIn(hint.uid, codigo.trim());
  return resolver.resolveSignIn(assertion);
}
