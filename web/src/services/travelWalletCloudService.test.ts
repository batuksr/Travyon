import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ get:vi.fn(), set:vi.fn(), listen:vi.fn() }));
vi.mock('./firebase',()=>({db:{}}));
vi.mock('firebase/firestore',()=>({
  doc: (_db:unknown,...parts:string[])=>parts.join('/'), collection:(_db:unknown,...parts:string[])=>parts.join('/'),
  runTransaction:(_db:unknown, fn:(tx:unknown)=>unknown)=>fn({get:mocks.get,set:mocks.set}), onSnapshot:mocks.listen,
}));
import { deleteWalletEntry, writeWalletEntry } from './travelWalletCloudService';
const entry = {id:'wallet1',planId:'general',category:'flight' as const,title:'Roma',reference:'ABC',date:'',note:'',url:'',details:{},createdAt:1,updatedAt:4};
describe('cross-device wallet',()=>{
  beforeEach(()=>vi.clearAllMocks());
  it('migrates missing records to the owner path only',async()=>{
    mocks.get.mockResolvedValue({exists:()=>false});
    await writeWalletEntry('uid',entry,'migrate');
    expect(mocks.set).toHaveBeenCalledWith('users/uid/wallet/wallet1',expect.objectContaining({title:'Roma',deleted:false,schemaVersion:1}));
  });
  it('never replaces newer cloud entries or deletion tombstones on migration',async()=>{
    for(const deleted of [true,false]) {
      mocks.get.mockResolvedValue({exists:()=>true,data:()=>({deleted,updatedAt:99})});
      await writeWalletEntry('uid',entry,'migrate');
    }
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it('rejects stale edits and edits of deleted records',async()=>{
    for(const data of [{deleted:true,updatedAt:4},{deleted:false,updatedAt:99}]) {
      mocks.get.mockResolvedValue({exists:()=>true,data:()=>data});
      await expect(writeWalletEntry('uid',entry,'update')).rejects.toThrow();
    }
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it('updates an unchanged record and clears personal fields on delete',async()=>{
    mocks.get.mockResolvedValue({exists:()=>true,data:()=>({deleted:false,updatedAt:4})});
    await writeWalletEntry('uid',entry,'update');
    expect(mocks.set).toHaveBeenCalledTimes(1);
    await deleteWalletEntry('uid','wallet1');
    const payload = mocks.set.mock.calls[1][1];
    expect(Object.keys(payload).sort()).toEqual(['deleted','schemaVersion','updatedAt']);
    expect(payload.deleted).toBe(true);
  });
});
