import { findModule, getProcesses, openProcess, readBuffer, readMemory as readMemoryRaw, findPattern as findPatternRaw, virtualAllocEx, writeBuffer, writeMemory, getProcessPath, } from 'memoryjs';
import Struct from 'structron';
import { IpcOverlayMessages, IpcRendererMessages } from '../common/ipc-messages';
import { GameState } from '../common/AmongUsState';
import { fetchOffsetLookup, fetchOffsetsJson } from './offsetStore';
import Errors from '../common/Errors';
import { CameraLocation, MapType } from '../common/AmongusMap';
import { GenerateAvatars, numberToColorHex } from './avatarGenerator';
import { RainbowColorId } from '../renderer/cosmetics';
import { platform } from 'os';
import fs from 'fs';
import path from 'path';
import { modList } from '../common/Mods';
import Store from 'electron-store';
const store = new Store();
export default class GameReader {
    constructor(sendIPC) {
        this.initializedWrite = false;
        this.writtenPingMessage = true;
        this.menuUpdateTimer = 20;
        this.lastPlayerPtr = 0;
        this.shouldReadLobby = false;
        this.is_64bit = false;
        this.is_linux = false;
        this.oldGameState = GameState.UNKNOWN;
        this.lastState = {};
        this.amongUs = null;
        this.gameAssembly = null;
        this.localPlayerName = '';
        this.colorsInitialized = false;
        this.rainbowColor = -9999;
        this.gameCode = 'MENU';
        this.shellcodeAddr = -1;
        this.currentServer = '';
        this.disableWriting = false;
        this.pid = -1;
        this.loadedMod = modList[0];
        this.gamePath = '';
        this.oldMeetingHud = false;
        this.playercolors = [];
        this.checkProcessDelay = 0;
        this.isLocalGame = false;
        this.skipPingMessage = 25;
        this.is_linux = platform() === 'linux';
        this.sendIPC = sendIPC;
    }
    async checkProcessOpen() {
        const processesOpen = getProcesses().filter((p) => p.szExeFile === 'Among Us.exe');
        let error = '';
        const reset = this.amongUs && processesOpen.filter((o) => o.th32ProcessID === this.pid).length === 0;
        if ((!this.amongUs || reset) && processesOpen.length > 0) {
            for (const processOpen of processesOpen) {
                try {
                    this.pid = processOpen.th32ProcessID;
                    this.amongUs = openProcess(processOpen.th32ProcessID);
                    this.gameAssembly = findModule('GameAssembly.dll', this.amongUs.th32ProcessID);
                    this.gamePath = getProcessPath(this.amongUs.handle);
                    this.loadedMod = this.getInstalledMods(this.gamePath);
                    await this.initializeoffsets();
                    this.sendIPC(IpcRendererMessages.NOTIFY_GAME_OPENED, true);
                    break;
                }
                catch (e) {
                    console.log('ERROR:', e);
                    if (processOpen && e.toString() === 'Error: unable to find process') {
                        error = Errors.OPEN_AS_ADMINISTRATOR;
                    }
                    else {
                        error = e.toString();
                    }
                    this.amongUs = null;
                }
            }
            if (!this.amongUs && error) {
                throw error;
            }
        }
        else if (this.amongUs && (processesOpen.length === 0 || reset)) {
            this.amongUs = null;
            try {
                this.sendIPC(IpcRendererMessages.NOTIFY_GAME_OPENED, false);
            }
            catch (e) {
                /*empty*/
            }
        }
        return;
    }
    getInstalledMods(filePath) {
        const pathLower = filePath.toLowerCase();
        if (pathLower.includes('?\\volume') || this.is_linux) {
            return modList[0];
        }
        else {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(path.join(dir, 'winhttp.dll')) || !fs.existsSync(path.join(dir, 'BepInEx\\plugins'))) {
                return modList[0];
            }
            for (const file of fs.readdirSync(path.join(dir, 'BepInEx\\plugins'))) {
                console.log(`MOD! ${file}`);
                const mod = modList.find((o) => o.dllStartsWith && file.includes(o.dllStartsWith));
                if (mod)
                    return mod;
            }
            return modList[0];
        }
    }
    async loop() {
        var _a;
        if (this.checkProcessDelay-- <= 0) {
            this.checkProcessDelay = 30;
            try {
                await this.checkProcessOpen();
            }
            catch (e) {
                this.checkProcessDelay = 0;
                return e.toString();
            }
        }
        if (this.PlayerStruct &&
            this.offsets &&
            this.amongUs !== null &&
            this.gameAssembly !== null &&
            this.offsets !== undefined) {
            this.loadColors();
            let state = GameState.UNKNOWN;
            const meetingHud = this.readMemory('pointer', this.gameAssembly.modBaseAddr, this.offsets.meetingHud);
            const meetingHud_cachePtr = meetingHud === 0 ? 0 : this.readMemory('pointer', meetingHud, this.offsets.objectCachePtr);
            const meetingHudState = meetingHud_cachePtr === 0 ? 4 : this.readMemory('int', meetingHud, this.offsets.meetingHudState, 4);
            const innerNetClient = this.readMemory('ptr', this.gameAssembly.modBaseAddr, this.offsets.innerNetClient.base);
            const gameState = this.readMemory('int', innerNetClient, this.offsets.innerNetClient.gameState);
            switch (gameState) {
                case 0:
                    state = GameState.MENU;
                    break;
                case 1:
                case 3:
                    state = GameState.LOBBY;
                    break;
                default:
                    if (meetingHudState < 4)
                        state = GameState.DISCUSSION;
                    else
                        state = GameState.TASKS;
                    break;
            }
            // const DEBUG = true;
            const lobbyCodeInt = state === GameState.MENU
                ? -1
                : this.readMemory('int32', innerNetClient, this.offsets.innerNetClient.gameId);
            this.gameCode =
                state === GameState.MENU
                    ? ''
                    : lobbyCodeInt === this.lastState.lobbyCodeInt
                        ? this.gameCode
                        : this.IntToGameCode(lobbyCodeInt);
            // if (DEBUG) {
            // 	this.gameCode = 'oof';
            // }
            const allPlayersPtr = this.readMemory('ptr', this.gameAssembly.modBaseAddr, this.offsets.allPlayersPtr);
            const allPlayers = this.readMemory('ptr', allPlayersPtr, this.offsets.allPlayers);
            const playerCount = this.readMemory('int', allPlayersPtr, this.offsets.playerCount);
            let playerAddrPtr = allPlayers + this.offsets.playerAddrPtr;
            const players = [];
            const hostId = this.readMemory('uint32', innerNetClient, this.offsets.innerNetClient.hostId);
            const clientId = this.readMemory('uint32', innerNetClient, this.offsets.innerNetClient.clientId);
            this.isLocalGame = lobbyCodeInt === 32; // is local game
            let lightRadius = 1;
            let comsSabotaged = false;
            let currentCamera = CameraLocation.NONE;
            let map = MapType.UNKNOWN;
            let maxPlayers = 10;
            const closedDoors = [];
            let localPlayer = undefined;
            if (this.currentServer === '' ||
                (this.oldGameState != state &&
                    (this.oldGameState === GameState.MENU || this.oldGameState === GameState.UNKNOWN))) {
                this.readCurrentServer();
            }
            if ((this.gameCode || this.isLocalGame) && playerCount) {
                for (let i = 0; i < Math.min(playerCount, 40); i++) {
                    const { address, last } = this.offsetAddress(playerAddrPtr, this.offsets.player.offsets);
                    if (address === 0)
                        continue;
                    const playerData = readBuffer(this.amongUs.handle, address + last, this.offsets.player.bufferLength);
                    const player = this.parsePlayer(address + last, playerData, clientId);
                    playerAddrPtr += this.is_64bit ? 8 : 4;
                    if (!player || state === GameState.MENU) {
                        continue;
                    }
                    if (this.isLocalGame && player.clientId == hostId) {
                        this.gameCode = ((player.nameHash % 99999)).toString();
                    }
                    if (player.isLocal) {
                        localPlayer = player;
                        this.localPlayerName = player.name;
                    }
                    players.push(player);
                }
                if (localPlayer) {
                    this.fixPingMessage();
                    lightRadius = this.readMemory('float', localPlayer.objectPtr, this.offsets.lightRadius, -1);
                }
                const gameOptionsPtr = this.readMemory('ptr', this.gameAssembly.modBaseAddr, this.offsets.playerControl_GameOptions);
                maxPlayers = this.readMemory('byte', gameOptionsPtr, this.offsets.gameOptions_MaxPLayers);
                map = this.readMemory('byte', gameOptionsPtr, this.offsets.gameOptions_MapId);
                if (state === GameState.TASKS) {
                    const shipPtr = this.readMemory('ptr', this.gameAssembly.modBaseAddr, this.offsets.shipStatus);
                    const systemsPtr = this.readMemory('ptr', shipPtr, this.offsets.shipStatus_systems);
                    if (systemsPtr !== 0 && state === GameState.TASKS) {
                        this.readDictionary(systemsPtr, 47, (k, v) => {
                            const key = this.readMemory('int32', k);
                            if (key === 14) {
                                const value = this.readMemory('ptr', v);
                                switch (map) {
                                    case MapType.AIRSHIP:
                                    case MapType.POLUS:
                                    case MapType.THE_SKELD:
                                    case MapType.SUBMERGED: {
                                        comsSabotaged =
                                            this.readMemory('uint32', value, this.offsets.HudOverrideSystemType_isActive) === 1;
                                        break;
                                    }
                                    case MapType.MIRA_HQ: {
                                        comsSabotaged =
                                            this.readMemory('uint32', value, this.offsets.hqHudSystemType_CompletedConsoles) < 2;
                                    }
                                }
                            }
                            else if (key === 18 && map === MapType.MIRA_HQ) {
                                //SystemTypes Decontamination
                                const value = this.readMemory('ptr', v);
                                const lowerDoorOpen = this.readMemory('int', value, this.offsets.deconDoorLowerOpen);
                                const upperDoorOpen = this.readMemory('int', value, this.offsets.deconDoorUpperOpen);
                                if (!lowerDoorOpen) {
                                    closedDoors.push(0);
                                }
                                if (!upperDoorOpen) {
                                    closedDoors.push(1);
                                }
                            }
                        });
                    }
                    const minigamePtr = this.readMemory('ptr', this.gameAssembly.modBaseAddr, this.offsets.miniGame);
                    const minigameCachePtr = this.readMemory('ptr', minigamePtr, this.offsets.objectCachePtr);
                    if (minigameCachePtr && minigameCachePtr !== 0 && localPlayer) {
                        if (map === MapType.POLUS || map === MapType.AIRSHIP) {
                            const currentCameraId = this.readMemory('uint32', minigamePtr, this.offsets.planetSurveillanceMinigame_currentCamera);
                            const camarasCount = this.readMemory('uint32', minigamePtr, this.offsets.planetSurveillanceMinigame_camarasCount);
                            if (currentCameraId >= 0 && currentCameraId <= 5 && camarasCount === 6) {
                                currentCamera = currentCameraId;
                            }
                        }
                        else if (map === MapType.THE_SKELD) {
                            const roomCount = this.readMemory('uint32', minigamePtr, this.offsets.surveillanceMinigame_FilteredRoomsCount);
                            if (roomCount === 4) {
                                const dist = Math.sqrt(Math.pow(localPlayer.x - -12.9364, 2) + Math.pow(localPlayer.y - -2.7928, 2));
                                if (dist < 0.6) {
                                    currentCamera = CameraLocation.Skeld;
                                }
                            }
                        }
                    }
                    if (map !== MapType.MIRA_HQ) {
                        const allDoors = this.readMemory('ptr', shipPtr, this.offsets.shipstatus_allDoors);
                        const doorCount = Math.min(this.readMemory('int', allDoors, this.offsets.playerCount), 16);
                        for (let doorNr = 0; doorNr < doorCount; doorNr++) {
                            const door = this.readMemory('ptr', allDoors + this.offsets.playerAddrPtr + doorNr * (this.is_64bit ? 0x8 : 0x4));
                            const doorOpen = this.readMemory('int', door + this.offsets.door_isOpen) === 1;
                            //	const doorId = this.readMemory<number>('int', door + this.offsets.door_doorId);
                            //console.log(doorId);
                            if (!doorOpen) {
                                closedDoors.push(doorNr);
                            }
                        }
                    }
                }
                //	console.log('doorcount: ', doorCount, doorsOpen);
            }
            // if (this.oldGameState === GameState.DISCUSSION && state === GameState.TASKS) {
            // 	if (impostors === 0 || impostors >= crewmates) {
            // 		this.exileCausesEnd = true;
            // 		state = GameState.LOBBY;
            // 	}
            // }
            if (this.oldGameState === GameState.MENU &&
                state === GameState.LOBBY &&
                this.menuUpdateTimer > 0 &&
                (this.lastPlayerPtr === allPlayers || !players.find((p) => p.isLocal))) {
                state = GameState.MENU;
                this.menuUpdateTimer--;
            }
            else {
                this.menuUpdateTimer = 20;
                this.lastPlayerPtr = allPlayers;
            }
            const lobbyCode = state !== GameState.MENU ? this.gameCode || 'MENU' : 'MENU';
            const newState = {
                lobbyCode: lobbyCode,
                lobbyCodeInt,
                players,
                gameState: lobbyCode === 'MENU' ? GameState.MENU : state,
                oldGameState: this.oldGameState,
                isHost: (hostId && clientId && hostId === clientId),
                hostId: hostId,
                clientId: clientId,
                comsSabotaged,
                currentCamera,
                lightRadius,
                lightRadiusChanged: lightRadius != ((_a = this.lastState) === null || _a === void 0 ? void 0 : _a.lightRadius),
                map,
                mod: this.loadedMod.id,
                closedDoors,
                currentServer: this.currentServer,
                maxPlayers,
                oldMeetingHud: this.oldMeetingHud,
            };
            //	const stateHasChanged = !equal(this.lastState, newState);
            if (state !== GameState.MENU || this.oldGameState !== GameState.MENU) {
                try {
                    this.sendIPC(IpcRendererMessages.NOTIFY_GAME_STATE_CHANGED, newState);
                }
                catch (e) {
                    process.exit(0);
                }
            }
            //	}
            this.lastState = newState;
            this.oldGameState = state;
        }
        return null;
    }
    async initializeoffsets() {
        console.log('INITIALIZEOFFSETS???');
        this.is_64bit = this.isX64Version();
        this.shellcodeAddr = -1;
        this.initializedWrite = false;
        this.disableWriting = false;
        const offsetLookups = await fetchOffsetLookup();
        let broadcastVersionAddr = undefined;
        if (this.is_64bit) {
            broadcastVersionAddr = this.findPattern(offsetLookups.patterns.x64.broadcastVersion.sig, offsetLookups.patterns.x64.broadcastVersion.patternOffset, offsetLookups.patterns.x64.broadcastVersion.addressOffset, false, true);
        }
        else {
            broadcastVersionAddr = this.findPattern(offsetLookups.patterns.x86.broadcastVersion.sig, offsetLookups.patterns.x86.broadcastVersion.patternOffset, offsetLookups.patterns.x86.broadcastVersion.addressOffset, false, true);
        }
        var broadcastVersion = this.readMemory('int', this.gameAssembly.modBaseAddr, broadcastVersionAddr);
        console.log("broadcastVersion: ", broadcastVersion);
        if (offsetLookups.versions[broadcastVersion]) {
            this.offsets = await fetchOffsetsJson(this.is_64bit, offsetLookups.versions[broadcastVersion].file);
        }
        else {
            this.offsets = await fetchOffsetsJson(this.is_64bit, offsetLookups.versions["default"].file); // can't find file for this client, return default
        }
        this.disableWriting = this.offsets.disableWriting;
        this.oldMeetingHud = this.offsets.oldMeetingHud;
        const innerNetClient = this.findPattern(this.offsets.signatures.innerNetClient.sig, this.offsets.signatures.innerNetClient.patternOffset, this.offsets.signatures.innerNetClient.addressOffset);
        const meetingHud = this.findPattern(this.offsets.signatures.meetingHud.sig, this.offsets.signatures.meetingHud.patternOffset, this.offsets.signatures.meetingHud.addressOffset);
        const gameData = this.findPattern(this.offsets.signatures.gameData.sig, this.offsets.signatures.gameData.patternOffset, this.offsets.signatures.gameData.addressOffset);
        const shipStatus = this.findPattern(this.offsets.signatures.shipStatus.sig, this.offsets.signatures.shipStatus.patternOffset, this.offsets.signatures.shipStatus.addressOffset);
        const miniGame = this.findPattern(this.offsets.signatures.miniGame.sig, this.offsets.signatures.miniGame.patternOffset, this.offsets.signatures.miniGame.addressOffset);
        const palette = this.findPattern(this.offsets.signatures.palette.sig, this.offsets.signatures.palette.patternOffset, this.offsets.signatures.palette.addressOffset);
        const playerControl = this.findPattern(this.offsets.signatures.playerControl.sig, this.offsets.signatures.playerControl.patternOffset, this.offsets.signatures.playerControl.addressOffset);
        this.offsets.playerControl_GameOptions[0] = playerControl;
        this.offsets.palette[0] = palette;
        this.offsets.meetingHud[0] = meetingHud;
        this.offsets.allPlayersPtr[0] = gameData;
        this.offsets.innerNetClient.base[0] = innerNetClient;
        this.offsets.shipStatus[0] = shipStatus;
        this.offsets.miniGame[0] = miniGame;
        if (!this.is_64bit) {
            this.offsets.connectFunc = this.findPattern(this.offsets.signatures.connectFunc.sig, this.offsets.signatures.connectFunc.patternOffset, this.offsets.signatures.connectFunc.addressOffset, true);
            this.offsets.fixedUpdateFunc = this.findPattern(this.offsets.signatures.fixedUpdateFunc.sig, this.offsets.signatures.fixedUpdateFunc.patternOffset, this.offsets.signatures.fixedUpdateFunc.addressOffset, false, true);
            this.offsets.showModStampFunc = this.findPattern(this.offsets.signatures.showModStamp.sig, this.offsets.signatures.showModStamp.patternOffset, this.offsets.signatures.showModStamp.addressOffset, false, true);
            this.offsets.modLateUpdateFunc = this.findPattern(this.offsets.signatures.modLateUpdate.sig, this.offsets.signatures.modLateUpdate.patternOffset, this.offsets.signatures.modLateUpdate.addressOffset, false, true);
        }
        this.offsets.serverManager_currentServer[0] = this.findPattern(this.offsets.signatures.serverManager.sig, this.offsets.signatures.serverManager.patternOffset, this.offsets.signatures.serverManager.addressOffset);
        // if (this.loadedMod.id === 'POLUS_GG') {
        // 	this.offsets.serverManager_currentServer[4] = 0x0c;
        // }
        this.colorsInitialized = false;
        console.log('serverManager_currentServer', this.offsets.serverManager_currentServer[0].toString(16));
        // if (innerNetClient === 30104372 ||
        // 	innerNetClient == 30001864 ||
        // 	innerNetClient == 30155956 ||
        // 	innerNetClient == 29580672 || 
        // 	innerNetClient == 30160488 ||
        // 	innerNetClient == 0x2c6c278 ||
        // 	innerNetClient == 0x1c57f54 ||
        // 	innerNetClient == 0x1d17f2c ||
        // 	innerNetClient == 0x1baa960 ||
        // 	innerNetClient == 0x1D17F2C ||
        // 	innerNetClient == 29777072 ||
        // 	innerNetClient == 0x1C9CAC8 ||
        // 	innerNetClient == 0x1d9dbb4 ||
        // 	innerNetClient == 0x1e247c4 || // Moving this soon to a new repo
        // 	innerNetClient == 30112580 || 
        // 	innerNetClient == 29537396 // 2022.2.24e
        // 	) {
        // 	this.offsets = TempFixOffsets7(this.offsets);
        // }
        // if (innerNetClient === 0x2c6c278) {
        // temp fix for older game until I added more sigs.. //
        // 	this.disableWriting = true;
        // 	this.oldMeetingHud = true;
        // 	this.offsets = TempFixOffsets(this.offsets);
        // }
        // if (innerNetClient === 0x1c57f54) {
        // 	this.disableWriting = true;
        // 	this.oldMeetingHud = true;
        // 	// temp fix for older game until I added more sigs.. // 12/9
        // 	this.offsets = TempFixOffsets2(this.offsets);
        // }
        // if (innerNetClient === 0x1d9dbb4 || innerNetClient === 0x1e247c4) {
        // 	// temp fix for older game until I added more sigs.. // 25/5
        // 	this.oldMeetingHud = true;
        // 	this.offsets = TempFixOffsets3(this.offsets);
        // 	const gameData = this.findPattern(
        // 		this.offsets.signatures.gameData.sig,
        // 		this.offsets.signatures.gameData.patternOffset,
        // 		this.offsets.signatures.gameData.addressOffset
        // 	);
        // 	this.offsets.allPlayersPtr[0] = gameData;
        // }
        // if (innerNetClient === 0x1d17f2c) {
        // 	//6/15
        // 	this.offsets = TempFixOffsets4(this.offsets);
        // }
        // if (innerNetClient === 0x1baa960 || innerNetClient == 0x1D17F2C || innerNetClient == 29777072) {
        // 	this.offsets = TempFixOffsets5(this.offsets);
        // 	this.disableWriting = true;
        // }
        // if (innerNetClient === 0x1C9CAC8) {
        // 	this.offsets = TempFixOffsets6(this.offsets);
        // }
        this.PlayerStruct = new Struct();
        for (const member of this.offsets.player.struct) {
            if (member.type === 'SKIP' && member.skip) {
                this.PlayerStruct = this.PlayerStruct.addMember(Struct.TYPES.SKIP(member.skip), member.name);
            }
            else {
                this.PlayerStruct = this.PlayerStruct.addMember(Struct.TYPES[member.type], member.name);
            }
        }
        console.log(JSON.stringify(this.offsets, function (k, v) {
            if (v instanceof Array && k != "struct")
                return JSON.stringify(v);
            return v;
        }, 2).replace(/\\/g, '')
            .replace(/\"\[/g, '[')
            .replace(/\]\"/g, ']')
            .replace(/\"\{/g, '{')
            .replace(/\}\"/g, '}'));
        this.initializeWrites();
    }
    initializeWrites() {
        if (this.is_64bit || !this.offsets || !this.amongUs || !this.gameAssembly || this.disableWriting || this.is_linux) {
            //not supported atm
            return;
        }
        // Shellcode to join games when u press join..
        const shellCodeAddr = virtualAllocEx(this.amongUs.handle, null, 0x60, 0x00001000 | 0x00002000, 0x40);
        const compareAddr = shellCodeAddr + 0x30;
        const compareAddr1 = (compareAddr & 0xff000000) >> 24;
        const compareAddr2 = (compareAddr & 0x00ff0000) >> 16;
        const compareAddr3 = (compareAddr & 0x0000ff00) >> 8;
        const compareAddr4 = compareAddr & 0x000000ff;
        //(DESTINATION_RVA - CURRENT_RVA (E9) - 5)
        const connectFunc = this.gameAssembly.modBaseAddr + this.offsets.connectFunc;
        const relativeConnectJMP = connectFunc - (shellCodeAddr + 0x18) - 0x4;
        const fixedUpdateFunc = this.gameAssembly.modBaseAddr + this.offsets.fixedUpdateFunc;
        const relativefixedJMP = fixedUpdateFunc + 0x5 - (shellCodeAddr + 0x24) - 0x4;
        const relativeShellJMP = shellCodeAddr - (fixedUpdateFunc + 0x1) - 0x4;
        const shellcode = [
            0x80,
            0x3d,
            compareAddr4,
            compareAddr3,
            compareAddr2,
            compareAddr1,
            0x00,
            0x74,
            0x13,
            0xc6,
            0x05,
            compareAddr4,
            compareAddr3,
            compareAddr2,
            compareAddr1,
            0x00,
            0xc7,
            0x45,
            0xfc,
            0x01,
            0x00,
            0x00,
            0x00,
            0xe9,
            relativeConnectJMP & 0x000000ff,
            (relativeConnectJMP & 0x0000ff00) >> 8,
            (relativeConnectJMP & 0x00ff0000) >> 16,
            (relativeConnectJMP & 0xff000000) >> 24,
            0x55,
            0x8b,
            0xec,
            0x56,
            0x8b,
            0x75,
            0x08,
            0xe9,
            relativefixedJMP & 0x000000ff,
            (relativefixedJMP & 0x0000ff00) >> 8,
            (relativefixedJMP & 0x00ff0000) >> 16,
            (relativefixedJMP & 0xff000000) >> 24,
        ];
        const shellcodeJMP = [
            // jmp ShellcodeRelativeAddress
            0xe9,
            relativeShellJMP & 0x000000ff,
            (relativeShellJMP & 0x0000ff00) >> 8,
            (relativeShellJMP & 0x00ff0000) >> 16,
            (relativeShellJMP & 0xff000000) >> 24,
        ];
        const modManagerLateUpdate = this.gameAssembly.modBaseAddr + this.offsets.modLateUpdateFunc;
        const shellCodeAddr_1 = shellCodeAddr + 0x300;
        const relativeShellJMP_1 = shellCodeAddr_1 - (modManagerLateUpdate + 0x1) - 0x4;
        const relativefixedJMP_1 = modManagerLateUpdate + 0x5 - (shellCodeAddr_1 + 0x1c) - 0x4;
        const showModStampFunc = this.gameAssembly.modBaseAddr + this.offsets.showModStampFunc;
        const relativeShowModStamp = showModStampFunc + 0x6 - (shellCodeAddr_1 + 0x12) - 0x4;
        const _compareAddr = shellCodeAddr + 0x44;
        const _compareAddr1 = (_compareAddr & 0xff000000) >> 24;
        const _compareAddr2 = (_compareAddr & 0x00ff0000) >> 16;
        const _compareAddr3 = (_compareAddr & 0x0000ff00) >> 8;
        const _compareAddr4 = _compareAddr & 0x000000ff;
        const shellcode_modIcon = [
            0x80,
            0x3d,
            _compareAddr4,
            _compareAddr3,
            _compareAddr2,
            _compareAddr1,
            0x00,
            0x74,
            0x0c,
            0xc6,
            0x05,
            _compareAddr4,
            _compareAddr3,
            _compareAddr2,
            _compareAddr1,
            0x00,
            0xe9,
            relativeShowModStamp & 0x000000ff,
            (relativeShowModStamp & 0x0000ff00) >> 8,
            (relativeShowModStamp & 0x00ff0000) >> 16,
            (relativeShowModStamp & 0xff000000) >> 24,
            0x53,
            0x8b,
            0xdc,
            0x83,
            0xec,
            0x08,
            0xe9,
            relativefixedJMP_1 & 0x000000ff,
            (relativefixedJMP_1 & 0x0000ff00) >> 8,
            (relativefixedJMP_1 & 0x00ff0000) >> 16,
            (relativefixedJMP_1 & 0xff000000) >> 24,
        ];
        const shellcodeJMP_1 = [
            // jmp ShellcodeRelativeAddress
            0xe9,
            relativeShellJMP_1 & 0x000000ff,
            (relativeShellJMP_1 & 0x0000ff00) >> 8,
            (relativeShellJMP_1 & 0x00ff0000) >> 16,
            (relativeShellJMP_1 & 0xff000000) >> 24,
            0x90,
        ];
        //MMOnline
        this.writeString(shellCodeAddr + 0x70, 'OnlineGame');
        this.writeString(shellCodeAddr + 0x95, 'MMOnline');
        this.writeString(shellCodeAddr + 0xd5, 'Ping: {0} ms');
        writeBuffer(this.amongUs.handle, shellCodeAddr, Buffer.from(shellcode));
        writeBuffer(this.amongUs.handle, fixedUpdateFunc, Buffer.from(shellcodeJMP));
        writeBuffer(this.amongUs.handle, shellCodeAddr_1, Buffer.from(shellcode_modIcon));
        writeBuffer(this.amongUs.handle, modManagerLateUpdate, Buffer.from(shellcodeJMP_1));
        this.shellcodeAddr = shellCodeAddr;
        this.writtenPingMessage = false;
        this.initializedWrite = true;
    }
    writeString(address, text) {
        const innerNetClient = this.readMemory('ptr', this.gameAssembly.modBaseAddr, this.offsets.innerNetClient.base);
        const stringBase = this.readMemory('int', innerNetClient, [0x80, 0x0]); // mainMenuScene just a random string where we can base our string off
        const connectionString = [
            stringBase & 0x000000ff,
            (stringBase & 0x0000ff00) >> 8,
            (stringBase & 0x00ff0000) >> 16,
            (stringBase & 0xff000000) >> 24,
            0x00,
            0x00,
            0x00,
            0x00,
            text.length,
            0x00,
            0x00,
            0x00,
        ];
        for (let index = 0; index < text.length; index++) {
            connectionString.push(text.charCodeAt(index));
            connectionString.push(0x0);
        }
        writeBuffer(this.amongUs.handle, address, Buffer.from(connectionString));
    }
    fixPingMessage() {
        if (!this.offsets ||
            !this.gameAssembly ||
            !this.initializedWrite ||
            this.writtenPingMessage ||
            this.skipPingMessage-- > 0) {
            return;
        }
        writeMemory(this.amongUs.handle, this.shellcodeAddr + 0x44, 1, 'int32'); // enable ModIcon
        this.skipPingMessage = 25;
        this.writtenPingMessage = true;
        for (let index = 0; index < 3; index++) {
            const stringOffset = this.findPattern(this.offsets.signatures.pingMessageString.sig, this.offsets.signatures.pingMessageString.patternOffset, this.offsets.signatures.pingMessageString.addressOffset, false, false, index);
            const stringPtr = this.readMemory('int', this.gameAssembly.modBaseAddr, stringOffset);
            const pingstring = this.readString(stringPtr);
            if (pingstring.includes('Ping') || pingstring.includes('<color=#BA68C8')) {
                let addStr = '';
                if (this.localPlayerName && store.get('useRHSJokes')) {
                    addStr = '\n<size=60%>';
                    const beers = [
                        'Wife Beater',
                        'Carlsberg',
                        'Corona',
                        'Fosters',
                        'Moretti',
                        'Peroni',
                        'Sprite',
                        'Tea, Earl Grey, Hot.',
                        'Coke Zero',
                        'Piss Water',
                    ];
                    switch (this.localPlayerName) {
                        case 'Overlord':
                            addStr += "Tonight's drink is: <color=#FF0000>" + beers[(beers.length * Math.random()) | 0] + '</color>';
                            break;
                        case 'Spanposter':
                            addStr += "<color=#BA68C8>I haven't been an alien in</color> <color=#FFFF00>ages</color>";
                            break;
                        case 'James':
                            addStr += 'It was a <color=#FFFF00>graphical</color> <color=#FF0000>bug</color>';
                            break;
                        case 'RHS':
                            addStr += "Remember to breathe. <color=#FF0000>Don't ragequit</color>";
                            break;
                        case 'Knuxina':
                            addStr += '<color=#FFFF00>*sigh*</color>';
                            break;
                        case 'GerbilSoft':
                            addStr += 'Quack.';
                            break;
                        case 'ur mom':
                            addStr += 'People who mess with the lights deserve everything they get';
                            break;
                        case 'Chris':
                            addStr += 'Bought a Wondermega yet?';
                            break;
                        case 'Giovanni':
                            addStr += "It's still coming home";
                            break;
                        case 'Hogeez':
                            addStr +=
                                'If you kill James, you lose your \n <color=#FFE751>Sonic</color> <color=#C31F80>C</color><color=#6EFFFF>o</color><color=#FFFD7D>l</color><color=#A946DE>o</color><color=#57C759>r</color><color=#F3F605>s</color> 100% save file';
                            break;
                    }
                    addStr += '</size>';
                }
                this.writeString(this.shellcodeAddr + 0xd5, 'Ping: {0}ms' + addStr);
                writeMemory(this.amongUs.handle, this.gameAssembly.modBaseAddr + stringOffset, this.shellcodeAddr + 0xd5, 'int32');
                break;
            }
        }
    }
    joinGame(code, server) {
        return false;
        // if (
        // 	!this.amongUs ||
        // 	!this.initializedWrite ||
        // 	server.length > 15 ||
        // 	!this.offsets ||
        // 	this.is_64bit
        // 	// || this.loadedMod.id === 'POLUS_GG'
        // ) {
        // 	return false;
        // }
        // const innerNetClient = this.readMemory<number>(
        // 	'ptr',
        // 	this.gameAssembly!.modBaseAddr,
        // 	this.offsets!.innerNetClient.base
        // );
        // this.writeString(this.shellcodeAddr + 0x40, server);
        // writeMemory(
        // 	this.amongUs.handle,
        // 	innerNetClient + this.offsets.innerNetClient.networkAddress,
        // 	this.shellcodeAddr + 0x40,
        // 	'int32'
        // );
        // writeMemory(
        // 	this.amongUs.handle,
        // 	innerNetClient + this.offsets.innerNetClient.onlineScene,
        // 	this.shellcodeAddr + 0x70,
        // 	'int32'
        // );
        // writeMemory(
        // 	this.amongUs.handle,
        // 	innerNetClient + this.offsets.innerNetClient.mainMenuScene,
        // 	this.shellcodeAddr + 0x95,
        // 	'int32'
        // );
        // writeMemory(this.amongUs.handle, innerNetClient + this.offsets.innerNetClient.networkPort, 22023, 'int32');
        // writeMemory(this.amongUs.handle, innerNetClient + this.offsets.innerNetClient.gameMode, 1, 'int32');
        // writeMemory(
        // 	this.amongUs.handle,
        // 	innerNetClient + this.offsets.innerNetClient.gameId,
        // 	this.gameCodeToInt(code),
        // 	'int32'
        // );
        // writeMemory(this.amongUs.handle, this.shellcodeAddr + 0x30, 1, 'int32'); // call connect function
        // return true;
    }
    loadColors() {
        if (this.colorsInitialized) {
            return;
        }
        const palletePtr = this.readMemory('ptr', this.gameAssembly.modBaseAddr, this.offsets.palette);
        const PlayerColorsPtr = this.readMemory('ptr', palletePtr, this.offsets.palette_playercolor);
        const ShadowColorsPtr = this.readMemory('ptr', palletePtr, this.offsets.palette_shadowColor);
        const colorLength = this.readMemory('int', ShadowColorsPtr, this.offsets.playerCount);
        console.log('Initializecolors', colorLength);
        if (!colorLength || colorLength <= 0 || colorLength > 300) {
            return;
        }
        this.rainbowColor = -9999;
        const playercolors = [];
        for (let i = 0; i < colorLength; i++) {
            const playerColor = this.readMemory('uint32', PlayerColorsPtr, [this.offsets.playerAddrPtr + i * 0x4]);
            const shadowColor = this.readMemory('uint32', ShadowColorsPtr, [this.offsets.playerAddrPtr + i * 0x4]);
            if (i == 0 && playerColor != 4279308742) {
                return;
            }
            if (playerColor === 4278190080) {
                this.rainbowColor = i;
            }
            //4278190080
            playercolors[i] = [numberToColorHex(playerColor), numberToColorHex(shadowColor)];
        }
        this.colorsInitialized = colorLength > 0;
        this.playercolors = playercolors;
        try {
            this.sendIPC(IpcOverlayMessages.NOTIFY_PLAYERCOLORS_CHANGED, playercolors);
            GenerateAvatars(playercolors)
                .then(() => console.log('done generate'))
                .catch((e) => console.error(e));
        }
        catch (e) {
            /* Empty block */
        }
    }
    isX64Version() {
        if (!this.amongUs || !this.gameAssembly)
            return false;
        const optionalHeader_offset = readMemoryRaw(this.amongUs.handle, this.gameAssembly.modBaseAddr + 0x3c, 'uint32');
        const optionalHeader_magic = readMemoryRaw(this.amongUs.handle, this.gameAssembly.modBaseAddr + optionalHeader_offset + 0x18, 'short');
        //	console.log(optionalHeader_magic, 'optionalHeader_magic');
        return optionalHeader_magic === 0x20b;
    }
    readCurrentServer() {
        const currentServer = this.readMemory('ptr', this.gameAssembly.modBaseAddr, this.offsets.serverManager_currentServer);
        this.currentServer = this.readString(currentServer);
    }
    readMemory(dataType, address, offsets, defaultParam) {
        if (!this.amongUs)
            return defaultParam;
        if (address === 0)
            return defaultParam;
        dataType = dataType == 'pointer' || dataType == 'ptr' ? (this.is_64bit ? 'uint64' : 'uint32') : dataType;
        if (typeof offsets === 'number') {
            offsets = [offsets];
        }
        const { address: addr, last } = this.offsetAddress(address, offsets || []);
        if (addr === 0)
            return defaultParam;
        return readMemoryRaw(this.amongUs.handle, addr + last, dataType);
    }
    offsetAddress(address, offsets) {
        if (!this.amongUs)
            throw 'Among Us not open? Weird error';
        address = this.is_64bit ? address : address;
        for (let i = 0; i < offsets.length - 1; i++) {
            address = readMemoryRaw(this.amongUs.handle, address + offsets[i], this.is_64bit ? 'uint64' : 'uint32');
            if (address == 0)
                break;
        }
        const last = offsets.length > 0 ? offsets[offsets.length - 1] : 0;
        return { address, last };
    }
    readString(address, maxLength = 50) {
        try {
            if (address === 0 || !this.amongUs) {
                return '';
            }
            const length = Math.max(0, Math.min(readMemoryRaw(this.amongUs.handle, address + (this.is_64bit ? 0x10 : 0x8), 'int'), maxLength));
            //				//readMemoryRaw<number>(this.amongUs.handle, address + (this.is_64bit ? 0x10 : 0x8), 'int')
            const buffer = readBuffer(this.amongUs.handle, address + (this.is_64bit ? 0x14 : 0xc), length << 1);
            if (buffer) {
                return buffer.toString('utf16le').replace(/\0/g, '');
            }
            else {
                return '';
            }
        }
        catch (e) {
            return '';
        }
    }
    readDictionary(address, maxLen, callback) {
        const entries = this.readMemory('ptr', address + (this.is_64bit ? 0x18 : 0xc));
        let len = this.readMemory('uint32', address + (this.is_64bit ? 0x20 : 0x10));
        len = len > maxLen ? maxLen : len;
        for (let i = 0; i < len; i++) {
            const offset = entries + ((this.is_64bit ? 0x20 : 0x10) + i * (this.is_64bit ? 0x18 : 0x10));
            callback(offset, offset + (this.is_64bit ? 0x10 : 0xc), i);
        }
    }
    findPattern(signature, patternOffset = 0x1, addressOffset = 0x0, relative = false, getLocation = false, skip = 0) {
        if (!this.amongUs || !this.gameAssembly)
            return 0x0;
        const signatureTypes = 0x0 | 0x2;
        const instruction_location = findPatternRaw(this.amongUs.handle, 'GameAssembly.dll', signature, signatureTypes, patternOffset, 0x0, skip);
        if (getLocation) {
            return instruction_location + addressOffset;
        }
        const offsetAddr = this.readMemory('int', this.gameAssembly.modBaseAddr, [instruction_location]);
        return this.is_64bit || relative
            ? offsetAddr + instruction_location + addressOffset
            : offsetAddr - this.gameAssembly.modBaseAddr;
    }
    IntToGameCode(input) {
        if (!input || input === 0)
            return '';
        else if (input <= -1000)
            return this.IntToGameCodeV2Impl(input);
        else if (input > 0)
            return this.IntToGameCodeV1Impl(input); // && this.loadedMod.id == 'POLUS_GG')
        else
            return '';
    }
    IntToGameCodeV1Impl(input) {
        const buf = Buffer.alloc(4);
        buf.writeInt32LE(input, 0);
        return buf.toString();
    }
    IntToGameCodeV2Impl(input) {
        const V2 = 'QWXRTYLPESDFGHUJKZOCVBINMA';
        const a = input & 0x3ff;
        const b = (input >> 10) & 0xfffff;
        return [
            V2[Math.floor(a % 26)],
            V2[Math.floor(a / 26)],
            V2[Math.floor(b % 26)],
            V2[Math.floor((b / 26) % 26)],
            V2[Math.floor((b / 676) % 26)],
            V2[Math.floor((b / 17576) % 26)],
        ].join('');
    }
    gameCodeToInt(code) {
        return code.length === 4 //&& this.loadedMod.id === 'POLUS_GG'
            ? this.gameCodeToIntV1Impl(code)
            : this.gameCodeToIntV2Impl(code);
    }
    gameCodeToIntV1Impl(code) {
        const buf = Buffer.alloc(4);
        buf.write(code);
        return buf.readInt32LE(0);
    }
    gameCodeToIntV2Impl(code) {
        const V2Map = [25, 21, 19, 10, 8, 11, 12, 13, 22, 15, 16, 6, 24, 23, 18, 7, 0, 3, 9, 4, 14, 20, 1, 2, 5, 17];
        const a = V2Map[code.charCodeAt(0) - 65];
        const b = V2Map[code.charCodeAt(1) - 65];
        const c = V2Map[code.charCodeAt(2) - 65];
        const d = V2Map[code.charCodeAt(3) - 65];
        const e = V2Map[code.charCodeAt(4) - 65];
        const f = V2Map[code.charCodeAt(5) - 65];
        const one = (a + 26 * b) & 0x3ff;
        const two = c + 26 * (d + 26 * (e + 26 * f));
        return one | ((two << 10) & 0x3ffffc00) | 0x80000000;
    }
    hashCode(s) {
        let h = 0;
        for (let i = 0; i < s.length; i++)
            h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
        return h;
    }
    parsePlayer(ptr, buffer, LocalclientId = -1) {
        var _a, _b, _c, _d;
        if (!this.PlayerStruct || !this.offsets)
            return undefined;
        const { data } = this.PlayerStruct.report(buffer, 0, {});
        if (this.is_64bit) {
            data.objectPtr = this.readMemory('pointer', ptr, [this.PlayerStruct.getOffsetByName('objectPtr')]);
            data.outfitsPtr = this.readMemory('pointer', ptr, [this.PlayerStruct.getOffsetByName('outfitsPtr')]);
            data.taskPtr = this.readMemory('pointer', ptr, [this.PlayerStruct.getOffsetByName('taskPtr')]);
            data.rolePtr = this.readMemory('pointer', ptr, [this.PlayerStruct.getOffsetByName('rolePtr')]);
            // data.name = this.readMemory('pointer', ptr, [this.PlayerStruct.getOffsetByName('name')]);
        }
        const clientId = this.readMemory('uint32', data.objectPtr, this.offsets.player.clientId);
        const isLocal = clientId === LocalclientId && data.disconnected === 0;
        const positionOffsets = isLocal
            ? [this.offsets.player.localX, this.offsets.player.localY]
            : [this.offsets.player.remoteX, this.offsets.player.remoteY];
        let x = this.readMemory('float', data.objectPtr, positionOffsets[0]);
        let y = this.readMemory('float', data.objectPtr, positionOffsets[1]);
        let currentOutfit = this.readMemory('uint32', data.objectPtr, this.offsets.player.currentOutfit);
        const isDummy = this.readMemory('boolean', data.objectPtr, this.offsets.player.isDummy);
        let name = 'error';
        let shiftedColor = -1;
        if (data.hasOwnProperty('name')) {
            name = this.readString(data.name).split(/<.*?>/).join('');
        }
        else {
            this.readDictionary(data.outfitsPtr, 6, (k, v, i) => {
                const key = this.readMemory('int32', k);
                const val = this.readMemory('ptr', v);
                if (key === 0 && i == 0) {
                    const namePtr = this.readMemory('pointer', val, this.offsets.player.outfit.playerName); // 0x40
                    data.color = this.readMemory('uint32', val, this.offsets.player.outfit.colorId); // 0x14
                    name = this.readString(namePtr).split(/<.*?>/).join('');
                    data.hat = this.readString(this.readMemory('ptr', val, this.offsets.player.outfit.hatId));
                    data.skin = this.readString(this.readMemory('ptr', val, this.offsets.player.outfit.skinId));
                    data.visor = this.readString(this.readMemory('ptr', val, this.offsets.player.outfit.visorId));
                    if (currentOutfit == 0 || currentOutfit > 10)
                        return;
                }
                else if (key === currentOutfit) {
                    shiftedColor = this.readMemory('uint32', val, this.offsets.player.outfit.colorId); // 0x14
                }
            });
            const roleTeam = this.readMemory('uint32', data.rolePtr, this.offsets.player.roleTeam);
            data.impostor = roleTeam;
            if (this.offsets.player.nameText && shiftedColor == -1 && (this.loadedMod.id == "THE_OTHER_ROLES" || this.loadedMod.id == "THE_OTHER_ROLES_GM")) {
                let nameText = this.readMemory('ptr', data.objectPtr, this.offsets.player.nameText);
                var nameText_name = this.readString(nameText);
                if (nameText_name != name) {
                    shiftedColor = data.color;
                }
            }
        }
        name = name.split(/<.*?>/).join('');
        let bugged = false;
        if (x === undefined || y === undefined || data.disconnected != 0 || data.color < 0 || data.color > this.playercolors.length) {
            x = 9999;
            y = 9999;
            bugged = true;
        }
        const x_round = parseFloat(x === null || x === void 0 ? void 0 : x.toFixed(4));
        const y_round = parseFloat(y === null || y === void 0 ? void 0 : y.toFixed(4));
        const nameHash = this.hashCode(name);
        const colorId = data.color === this.rainbowColor ? RainbowColorId : data.color;
        return {
            ptr,
            id: data.id,
            clientId: clientId,
            name,
            nameHash,
            colorId,
            hatId: (_a = data.hat) !== null && _a !== void 0 ? _a : '',
            petId: (_b = data.pet) !== null && _b !== void 0 ? _b : '',
            skinId: (_c = data.skin) !== null && _c !== void 0 ? _c : '',
            visorId: (_d = data.visor) !== null && _d !== void 0 ? _d : '',
            disconnected: data.disconnected != 0,
            isImpostor: data.impostor == 1,
            isDead: data.dead == 1,
            taskPtr: data.taskPtr,
            objectPtr: data.objectPtr,
            shiftedColor,
            bugged,
            inVent: this.readMemory('byte', data.objectPtr, this.offsets.player.inVent) > 0,
            isLocal,
            isDummy,
            x: x_round || x || 999,
            y: y_round || y || 999,
        };
    }
}
//# sourceMappingURL=GameReader.js.map