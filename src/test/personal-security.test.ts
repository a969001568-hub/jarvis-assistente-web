import {describe,it,expect} from 'vitest';
import {encryptKey,decryptKey,CONNECTOR_SCOPES} from '../lib/google-connectors.server';
import {readPublicArticle} from '../lib/public-web.server';
describe('Personal account security',()=>{
 it('encrypts and authenticates connector keys',()=>{const secret=Buffer.alloc(32,7).toString('base64');const ciphertext=encryptKey('test-connection',secret);expect(ciphertext).not.toContain('test-connection');expect(decryptKey(ciphertext,secret)).toBe('test-connection');expect(()=>decryptKey(ciphertext,Buffer.alloc(32,8).toString('base64'))).toThrow();});
 it('requests read-only Gmail permission',()=>{expect(CONNECTOR_SCOPES['google_mail']).toContain('https://www.googleapis.com/auth/gmail.readonly');expect(CONNECTOR_SCOPES['google_mail']).not.toContain('https://www.googleapis.com/auth/gmail.send');});
 it('rejects private network and arbitrary public destinations',async()=>{expect(await readPublicArticle('http://127.0.0.1/private')).toBe('');expect(await readPublicArticle('https://example.com')).toBe('');expect(await readPublicArticle('https://user:password@g1.globo.com/')).toBe('');});
});
