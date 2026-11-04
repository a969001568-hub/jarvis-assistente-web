import { describe, it, expect, vi } from 'vitest';
import { AUTH_UNAVAILABLE, observeAuth } from '@/lib/auth-session';

describe('auth initialization recovery', () => {
  it('keeps the app usable when client configuration is missing', () => {
    const update = vi.fn();
    const stop = observeAuth(() => { throw new Error('Missing configuration'); }, update, vi.fn());
    expect(update).toHaveBeenCalledWith({user:null,ready:true,error:AUTH_UNAVAILABLE});
    expect(() => stop()).not.toThrow();
  });
  it('handles rejected initial session reads without an unhandled rejection', async () => {
    const update = vi.fn(); const unsubscribe = vi.fn();
    const stop = observeAuth(() => ({ getUser: () => Promise.reject(new Error('Network')), onAuthStateChange: () => ({data:{subscription:{unsubscribe}}}) }), update, vi.fn());
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(update).toHaveBeenCalledWith({user:null,ready:true,error:AUTH_UNAVAILABLE});
    stop(); expect(unsubscribe).toHaveBeenCalledOnce();
  });
});