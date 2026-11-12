import {describe,it,expect} from 'vitest';
import {encryptKey,decryptKey,CONNECTOR_SCOPES} from '../lib/google-connectors.server';
import {readPublicArticle,isPublicWebUrl} from '../lib/public-web.server';
describe('Personal account security',()=>{
 it('encrypts and authenticates connector keys',()=>{const secret=Buffer.alloc(32,7).toString('base64');const ciphertext=encryptKey('test-connection',secret);expect(ciphertext).not.toContain('test-connection');expect(decryptKey(ciphertext,secret)).toBe('test-connection');expect(()=>decryptKey(ciphertext,Buffer.alloc(32,8).toString('base64'))).toThrow();});
 it('requests read-only Gmail permission',()=>{expect(CONNECTOR_SCOPES['google_mail']).toContain('https://www.googleapis.com/auth/gmail.readonly');expect(CONNECTOR_SCOPES['google_mail']).not.toContain('https://www.googleapis.com/auth/gmail.send');});
 it('rejects private network, IP, port and credential destinations',async()=>{expect(await readPublicArticle('http://127.0.0.1/private')).toBe('');expect(await readPublicArticle('https://10.0.0.1/')).toBe('');expect(await readPublicArticle('https://localhost/')).toBe('');expect(await readPublicArticle('https://router.local/')).toBe('');expect(await readPublicArticle('https://g1.globo.com:8443/')).toBe('');expect(await readPublicArticle('https://user:password@g1.globo.com/')).toBe('');});
 it('accepts ordinary public https pages',()=>{expect(isPublicWebUrl('https://www.climatempo.com.br/previsao')?.hostname).toBe('www.climatempo.com.br');});
});
