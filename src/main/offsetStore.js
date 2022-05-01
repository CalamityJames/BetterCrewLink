import fetch from 'node-fetch';
import Errors from '../common/Errors';
const BASE_URL = "https://raw.githubusercontent.com/OhMyGuus/BetterCrewlink-Offsets/main";
export async function fetchOffsetLookup() {
    console.log(`Fetching lookup file`);
    return fetch(`${BASE_URL}/lookup.json`)
        .then((response) => response.json())
        .then((data) => { return data; })
        .catch((_) => { throw Errors.LOOKUP_FETCH_ERROR; });
}
const OFFSETS_URL = `${BASE_URL}/offsets`;
export async function fetchOffsetsJson(is_64bit, filename) {
    console.log(`Fetching file: ${filename}`);
    return fetch(`${OFFSETS_URL}/${is_64bit ? 'x64' : 'x86'}/${filename}`)
        .then((response) => response.json())
        .then((data) => { return data; })
        .catch((_) => { throw Errors.LOOKUP_FETCH_ERROR; });
}
// export function TempFixOffsets(offsetsOld: IOffsets): IOffsets {
// 	const offsets = JSON.parse(JSON.stringify(offsetsOld)) as IOffsets; // ugly copy
// 	offsets.innerNetClient.gameState = 0x6c;
// 	offsets.innerNetClient.gameId = 0x48;
// 	offsets.innerNetClient.hostId = 0x4c;
// 	offsets.innerNetClient.clientId = 0x50;
// 	offsets.player.struct[3].skip = 1;
// 	offsets.player.struct[4].type = 'USHORT';
// 	offsets.player.struct.splice(5, 0, { type: 'SKIP', skip: 1, name: 'unused' });
// 	return offsets;
// }
// export function TempFixOffsets2(offsetsOld: IOffsets): IOffsets {
// 	const offsets = JSON.parse(JSON.stringify(offsetsOld)) as IOffsets; // ugly copy
// 	offsets.player.localX[0] = 0x60;
// 	offsets.player.localY[0] = 0x60;
// 	offsets.player.remoteX[0] = 0x60;
// 	offsets.player.remoteY[0] = 0x60;
// 	offsets.shipStatus_map[0] = 0xd4;
// 	offsets.innerNetClient.gameState = 0x64;
// 	offsets.innerNetClient.gameId = 0x40;
// 	offsets.innerNetClient.hostId = 0x44;
// 	offsets.innerNetClient.clientId = 0x48;
// 	offsets.player.struct = offsets.player.struct.filter((o) => o.name !== 'COLORBEFORE');
// 	offsets.player.struct[4].skip = 2;
// 	offsets.palette[0] = 0x1c57fc4;
// 	offsets.palette_playercolor[0] = 0xe4;
// 	offsets.palette_shadowColor[0] = 0xe8;
// 	offsets.shipStatus_systems[0] = 0x84;
// 	return offsets;
// }
// export function TempFixOffsets3(offsetsOld: IOffsets): IOffsets {
// 	const offsets = JSON.parse(JSON.stringify(offsetsOld)) as IOffsets; // ugly copy
// 	offsets.player.localX[0] = 0x64;
// 	offsets.player.localY[0] = 0x64;
// 	offsets.player.remoteX[0] = 0x64;
// 	offsets.player.remoteY[0] = 0x64;
// 	offsets.palette_playercolor[0] = 0xe8;
// 	offsets.palette_shadowColor[0] = 0xec;
// 	offsets.signatures.gameData.patternOffset = 2;
// 	offsets.signatures.gameData.sig = '8B 0D ? ? ? ? 8B F0 83 C4 10 8B 49 5C 8B 01';
// 	return offsets;
// }
// export function TempFixOffsets4(offsetsOld: IOffsets): IOffsets {
// 	const offsets = JSON.parse(JSON.stringify(offsetsOld)) as IOffsets; // ugly copy
// 	offsets.innerNetClient.gameState = 0x70;
// 	offsets.innerNetClient.onlineScene = 0x7c;
// 	offsets.innerNetClient.mainMenuScene = 0x80;
// 	return offsets;
// }
// export function TempFixOffsets5(offsetsOld: IOffsets): IOffsets {
// 	const offsets = JSON.parse(JSON.stringify(offsetsOld)) as IOffsets; // ugly copy
// 	offsets.player = {
// 		struct: [
// 			{ type: 'SKIP', skip: 8, name: 'unused' },
// 			{ type: 'UINT', name: 'id' },
// 			{ type: 'UINT', name: 'name' },
// 			{ type: 'SKIP', skip: 4, name: 'COLORBEFORE' },
// 			{ type: 'UINT', name: 'color' },
// 			{ type: 'UINT', name: 'hat' },
// 			{ type: 'UINT', name: 'pet' },
// 			{ type: 'UINT', name: 'skin' },
// 			{ type: 'UINT', name: 'disconnected' },
// 			{ type: 'UINT', name: 'taskPtr' },
// 			{ type: 'BYTE', name: 'impostor' },
// 			{ type: 'BYTE', name: 'dead' },
// 			{ type: 'SKIP', skip: 2, name: 'unused' },
// 			{ type: 'UINT', name: 'objectPtr' },
// 		],
// 		isDummy: [0x89],
// 		isLocal: [0x54],
// 		localX: [0x60, 80],
// 		localY: [0x60, 84],
// 		remoteX: [0x60, 60],
// 		remoteY: [0x60, 64],
// 		bufferLength: 56,
// 		offsets: [0, 0],
// 		inVent: [0x31],
// 		clientId: [0x1c],
// 		roleTeam: [0xff],
// 		currentOutfit: [0xff],
// 		outfit: {
// 			colorId: [0xff],
// 			hatId: [0xff],
// 			skinId: [0xff],
// 			visorId: [0xff],
// 			playerName: [0xff],
// 		},
// 	};
// 	//	offsets.palette[0] = 0x1ba85a4;
// 	offsets.palette_shadowColor = [0xf8];
// 	offsets.palette_playercolor = [0xf4];
// 	offsets.innerNetClient.gameMode = 0x48;
// 	offsets.innerNetClient.gameId = 0x4C;
// 	offsets.innerNetClient.hostId = 0x50;
// 	offsets.innerNetClient.clientId = 0x54;
// 	offsets.innerNetClient.gameState = 0x74;
// 	offsets.innerNetClient.onlineScene = 0x80;
// 	offsets.innerNetClient.mainMenuScene = 0x84;
// 	offsets.shipStatus_systems = [0x8c];
// 	offsets.shipstatus_allDoors = [0x84];
// 	offsets.shipStatus_map = [0xe4];
// 	offsets.lightRadius = [0x54, 0x1c];
// 	return offsets;
// }
// export function TempFixOffsets6(offsetsOld: IOffsets): IOffsets {
// 	const offsets = JSON.parse(JSON.stringify(offsetsOld)) as IOffsets; // ugly copy
// 	offsets.innerNetClient.gameMode = 0x48;
// 	offsets.innerNetClient.gameId = 0x4C;
// 	offsets.innerNetClient.hostId = 0x50;
// 	offsets.innerNetClient.clientId = 0x54;
// 	offsets.innerNetClient.gameState = 0x78;
// 	offsets.innerNetClient.onlineScene = 0x88;
// 	offsets.innerNetClient.mainMenuScene = 0x8C;
// 	return offsets;
// }
// export function TempFixOffsets7(offsetsOld: IOffsets): IOffsets {
// 	console.log("TempFixed7")
// 	const offsets = JSON.parse(JSON.stringify(offsetsOld)) as IOffsets; // ugly copy
// 	offsets.player.struct = [
// 		{ type: 'SKIP', skip: 8, name: 'unused' },
// 		{ type: 'UINT', name: 'id' },
// 		{ type: 'UINT', name: 'outfitsPtr' },
// 		{ type: 'UINT', name: 'playerLevel' },
// 		{ type: 'UINT', name: 'disconnected' },
// 		{ type: 'UINT', name: 'rolePtr' },
// 		{ type: 'UINT', name: 'taskPtr' },
// 		{ type: 'BYTE', name: 'dead' },
// 		{ type: 'SKIP', skip: 3, name: 'unused2' },
// 		{ type: 'UINT', name: 'objectPtr' },
// 	];
// 	offsets.player.inVent = [0x38];
// 	offsets.player.isDummy = [0xa9];
// 	offsets.player.isLocal = [0x60];
// 	offsets.player.localX = [0x6c, 80];
// 	offsets.player.localY = [0x6c, 84];
// 	offsets.player.remoteX = [0x6c, 60];
// 	offsets.player.remoteY = [0x6c, 64];
// 	offsets.player.currentOutfit = [0x34];
// 	offsets.player.nameText = [0x58, 0x80];
// 	offsets.gameOptions_MapId = [0x10];
// 	offsets.gameOptions_MaxPLayers = [0x8];
// 	return offsets;
// }
//# sourceMappingURL=offsetStore.js.map