import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import io from 'socket.io-client';
import Avatar from './Avatar';
import { GameStateContext, LobbySettingsContext, PlayerColorContext, SettingsContext } from './contexts';
import { GameState, } from '../common/AmongUsState';
import Peer from 'simple-peer';
import { ipcRenderer } from 'electron';
import VAD from './vad';
import { IpcRendererMessages, IpcMessages, IpcOverlayMessages, IpcHandlerMessages } from '../common/ipc-messages';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import makeStyles from '@material-ui/core/styles/makeStyles';
import SupportLink from './SupportLink';
import Divider from '@material-ui/core/Divider';
import { validateClientPeerConfig } from './validateClientPeerConfig';
// @ts-ignore
import reverbOgx from 'arraybuffer-loader!../../static/sounds/reverb.ogx'; // @ts-ignore
import radioOnSound from '../../static/sounds/radio_on.wav'; // @ts-ignore
// import radioBeep2 from '../../static/sounds/radio_beep2.wav';
import { CameraLocation, AmongUsMaps, MapType } from '../common/AmongusMap';
import Store from 'electron-store';
// import { poseCollide } from '../common/ColliderMap';
import Footer from './Footer';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import VolumeOff from '@material-ui/icons/VolumeOff';
import VolumeUp from '@material-ui/icons/VolumeUp';
import Mic from '@material-ui/icons/Mic';
import MicOff from '@material-ui/icons/MicOff';
import adapter from 'webrtc-adapter';
import { pushToTalkOptions } from './settings/Settings';
import { poseCollide } from '../common/ColliderMap';
console.log(adapter.browserDetails.browser);
const DEFAULT_ICE_CONFIG = {
    iceTransportPolicy: 'all',
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302',
        },
    ],
};
const DEFAULT_ICE_CONFIG_TURN = {
    iceTransportPolicy: 'relay',
    iceServers: [
        {
            urls: 'turn:turn.bettercrewl.ink:3478',
            username: 'M9DRVaByiujoXeuYAAAG',
            credential: 'TpHR9HQNZ8taxjb3',
        },
    ],
};
const useStyles = makeStyles((theme) => ({
    error: {
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
    },
    root: {
        paddingTop: theme.spacing(3),
    },
    top: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    right: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    username: {
        display: 'block',
        textAlign: 'center',
        fontSize: 20,
        whiteSpace: 'nowrap',
    },
    code: {
        fontFamily: "'Source Code Pro', monospace",
        display: 'block',
        width: 'fit-content',
        margin: '5px auto',
        padding: 5,
        borderRadius: 5,
        fontSize: 28,
    },
    otherplayers: {
        width: 225,
        height: 225,
        margin: '4px auto',
        '& .MuiGrid-grid-xs-1': {
            maxHeight: '8.3333333%',
        },
        '& .MuiGrid-grid-xs-2': {
            maxHeight: '16.666667%',
        },
        '& .MuiGrid-grid-xs-3': {
            maxHeight: '25%',
        },
        '& .MuiGrid-grid-xs-4': {
            maxHeight: '33.333333%',
        },
    },
    avatarWrapper: {
        width: 80,
        padding: theme.spacing(1),
    },
    muteButtons: {
        paddingLeft: '5px',
        paddingTop: '26px',
        float: 'right',
        display: 'grid',
    },
    left: { float: 'left' },
}));
const defaultlocalLobbySettings = {
    maxDistance: 5.32,
    haunting: false,
    hearImpostorsInVents: false,
    impostersHearImpostersInvent: false,
    impostorRadioEnabled: false,
    commsSabotage: false,
    deadOnly: false,
    hearThroughCameras: false,
    wallsBlockAudio: false,
    meetingGhostOnly: false,
    visionHearing: false,
    publicLobby_on: false,
    publicLobby_title: '',
    publicLobby_language: 'en',
};
const radioOnAudio = new Audio();
radioOnAudio.src = radioOnSound;
radioOnAudio.volume = 0.02;
// const radiobeepAudio2 = new Audio();
// radiobeepAudio2.src = radioBeep2;
// radiobeepAudio2.volume = 0.2;
const store = new Store();
const Voice = function ({ t, error: initialError }) {
    var _a;
    const [error, setError] = useState('');
    const [settings] = useContext(SettingsContext);
    const settingsRef = useRef(settings);
    const [lobbySettings, setLobbySettings] = useContext(LobbySettingsContext);
    const lobbySettingsRef = useRef(lobbySettings);
    const maxDistanceRef = useRef(2);
    const gameState = useContext(GameStateContext);
    const playerColors = useContext(PlayerColorContext);
    const hostRef = useRef({
        map: MapType.UNKNOWN,
        mobileRunning: false,
        gamestate: gameState.gameState,
        code: gameState.lobbyCode,
        hostId: gameState.hostId,
        parsedHostId: gameState.hostId,
        isHost: gameState.isHost,
        serverHostId: 0,
    });
    let { lobbyCode: displayedLobbyCode } = gameState;
    if (displayedLobbyCode !== 'MENU' && settings.hideCode)
        displayedLobbyCode = 'LOBBY';
    const [talking, setTalking] = useState(false);
    const [socketClients, setSocketClients] = useState({});
    const [playerConfigs] = useState(settingsRef.current.playerConfigMap);
    const socketClientsRef = useRef(socketClients);
    const [peerConnections, setPeerConnections] = useState({});
    const convolverBuffer = useRef(null);
    const playerSocketIdsRef = useRef({});
    const classes = useStyles();
    const [connect, setConnect] = useState(null);
    const [otherTalking, setOtherTalking] = useState({});
    const [otherVAD, setOtherVAD] = useState({});
    const [otherDead, setOtherDead] = useState({});
    const impostorRadioClientId = useRef(-1);
    const audioElements = useRef({});
    const [audioConnected, setAudioConnected] = useState({});
    const [deafenedState, setDeafened] = useState(false);
    const [mutedState, setMuted] = useState(false);
    const [connected, setConnected] = useState(false);
    function applyEffect(gain, effectNode, destination, player) {
        console.log('Apply effect->', effectNode);
        try {
            gain.disconnect(destination);
            gain.connect(effectNode);
            effectNode.connect(destination);
        }
        catch (_a) {
            console.log('error with applying effect: ', player.name, effectNode);
        }
    }
    function restoreEffect(gain, effectNode, destination, player) {
        console.log('restore effect->', effectNode);
        try {
            effectNode.disconnect(destination);
            gain.disconnect(effectNode);
            gain.connect(destination);
        }
        catch (_a) {
            console.log('error with applying effect: ', player.name, effectNode);
        }
    }
    function calculateVoiceAudio(state, settings, me, other, audio) {
        const { pan, gain, muffle, reverb, destination } = audio;
        const audioContext = pan.context;
        const useLightSource = true;
        let maxdistance = maxDistanceRef.current;
        let panPos = [other.x - me.x, other.y - me.y];
        let endGain = 0;
        let collided = false;
        let skipDistanceCheck = false;
        let muffleEnabled = false;
        if (other.disconnected || other.isDummy) {
            return 0;
        }
        switch (state.gameState) {
            case GameState.MENU:
                return 0;
            case GameState.LOBBY:
                endGain = 1;
                break;
            case GameState.TASKS:
                endGain = 1;
                if (lobbySettings.meetingGhostOnly) {
                    endGain = 0;
                }
                if (!me.isDead && lobbySettings.commsSabotage && state.comsSabotaged && !me.isImpostor) {
                    endGain = 0;
                }
                // Mute other players which are in a vent
                if (other.inVent &&
                    !(lobbySettings.hearImpostorsInVents || (lobbySettings.impostersHearImpostersInvent && me.inVent))) {
                    endGain = 0;
                }
                if (lobbySettings.wallsBlockAudio &&
                    !me.isDead &&
                    poseCollide({ x: me.x, y: me.y }, { x: other.x, y: other.y }, gameState.map, gameState.closedDoors)) {
                    collided = true;
                }
                if (me.isImpostor &&
                    other.isImpostor &&
                    lobbySettings.impostorRadioEnabled &&
                    other.clientId === impostorRadioClientId.current) {
                    skipDistanceCheck = true;
                    muffle.type = 'highpass';
                    muffle.frequency.value = 1000;
                    muffle.Q.value = 10;
                    muffleEnabled = true;
                    if (!audio.muffleConnected) {
                        audio.muffleConnected = true;
                        applyEffect(gain, muffle, destination, other);
                    }
                }
                if (!me.isDead && other.isDead && me.isImpostor && lobbySettings.haunting) {
                    if (!audio.reverbConnected) {
                        audio.reverbConnected = true;
                        applyEffect(gain, reverb, destination, other);
                    }
                    collided = false;
                    endGain = 0.1;
                }
                else {
                    if (other.isDead && !me.isDead) {
                        endGain = 0;
                    }
                }
                break;
            case GameState.DISCUSSION:
                panPos = [0, 0];
                endGain = 1;
                if (!me.isDead && other.isDead) {
                    endGain = 0;
                }
                break;
            case GameState.UNKNOWN:
            default:
                endGain = 0;
                break;
        }
        if (useLightSource && state.lightRadiusChanged) {
            pan.maxDistance = maxDistanceRef.current;
        }
        if (!other.isDead || state.gameState !== GameState.TASKS || !me.isImpostor || me.isDead) {
            if (audio.reverbConnected && reverb) {
                audio.reverbConnected = false;
                restoreEffect(gain, reverb, destination, other);
            }
        }
        if (lobbySettings.deadOnly) {
            panPos = [0, 0];
            if (!me.isDead || !other.isDead) {
                endGain = 0;
            }
        }
        let isOnCamera = state.currentCamera !== CameraLocation.NONE;
        if (!skipDistanceCheck && Math.sqrt(panPos[0] * panPos[0] + panPos[1] * panPos[1]) > maxdistance) {
            if (lobbySettings.hearThroughCameras && state.gameState === GameState.TASKS) {
                if (state.currentCamera !== CameraLocation.NONE && state.currentCamera !== CameraLocation.Skeld) {
                    const camerapos = AmongUsMaps[state.map].cameras[state.currentCamera];
                    panPos = [other.x - camerapos.x, other.y - camerapos.y];
                    console.log('camerapos: ', camerapos);
                }
                else if (state.currentCamera === CameraLocation.Skeld) {
                    let distance = 999;
                    let camerapos = { x: 999, y: 999 };
                    for (const camera of Object.values(AmongUsMaps[state.map].cameras)) {
                        const cameraDist = Math.sqrt(Math.pow(other.x - camera.x, 2) + Math.pow(other.y - camera.y, 2));
                        if (distance > cameraDist) {
                            distance = cameraDist;
                            camerapos = camera;
                        }
                    }
                    if (distance != 999) {
                        panPos = [other.x - camerapos.x, other.y - camerapos.y];
                    }
                }
                if (Math.sqrt(panPos[0] * panPos[0] + panPos[1] * panPos[1]) > maxdistance) {
                    return 0;
                }
            }
            else {
                return 0;
            }
        }
        else {
            if (collided && !skipDistanceCheck) {
                return 0;
            }
            isOnCamera = false;
        }
        // Muffling in vents
        if (((me.inVent && !me.isDead) || (other.inVent && !other.isDead) || isOnCamera) &&
            state.gameState === GameState.TASKS) {
            if (!audio.muffleConnected) {
                audio.muffleConnected = true;
                applyEffect(gain, muffle, destination, other);
            }
            maxdistance = isOnCamera ? 3 : 0.8;
            muffle.frequency.value = isOnCamera ? 2300 : 2000;
            muffle.Q.value = isOnCamera ? -15 : 20;
            if (endGain === 1)
                endGain = isOnCamera ? 0.8 : 0.5; // Too loud at 1
        }
        else {
            if (audio.muffleConnected && !muffleEnabled) {
                audio.muffleConnected = false;
                restoreEffect(gain, muffle, destination, other);
            }
        }
        if (!settings.enableSpatialAudio || skipDistanceCheck) {
            panPos = [0, 0];
        }
        pan.positionX.setValueAtTime(panPos[0], audioContext.currentTime);
        pan.positionY.setValueAtTime(panPos[1], audioContext.currentTime);
        pan.positionZ.setValueAtTime(-0.5, audioContext.currentTime);
        return endGain;
    }
    function notifyMobilePlayers() {
        var _a;
        if (settingsRef.current.mobileHost &&
            hostRef.current.gamestate !== GameState.MENU &&
            hostRef.current.gamestate !== GameState.UNKNOWN) {
            (_a = connectionStuff.current.socket) === null || _a === void 0 ? void 0 : _a.emit('signal', {
                to: hostRef.current.code + '_mobile',
                data: { mobileHostInfo: { isHostingMobile: true, isGameHost: hostRef.current.isHost } },
            });
        }
        setTimeout(() => notifyMobilePlayers(), 5000);
    }
    function disconnectAudioHtmlElement(element) {
        console.log('disableing element?', element);
        element.pause();
        if (element.srcObject) {
            const mediaStream = element.srcObject;
            mediaStream.getTracks().forEach((track) => track.stop());
        }
        element.removeAttribute('srcObject');
        element.removeAttribute('src');
        element.srcObject = null;
        element.load();
        element.remove();
    }
    function disconnectAudioElement(peer) {
        var _a;
        if (audioElements.current[peer]) {
            console.log('removing element..');
            disconnectAudioHtmlElement(audioElements.current[peer].audioElement);
            disconnectAudioHtmlElement(audioElements.current[peer].dummyAudioElement);
            audioElements.current[peer].pan.disconnect();
            audioElements.current[peer].gain.disconnect();
            // if (audioElements.current[peer].reverbGain != null) audioElements.current[peer].reverbGain?.disconnect();
            if (audioElements.current[peer].reverb != null)
                (_a = audioElements.current[peer].reverb) === null || _a === void 0 ? void 0 : _a.disconnect();
            delete audioElements.current[peer];
        }
    }
    function disconnectPeer(peer) {
        console.log('Disconnect peer: ', peer);
        const connection = peerConnections[peer];
        if (!connection) {
            return;
        }
        connection.destroy();
        setPeerConnections((connections) => {
            delete connections[peer];
            return connections;
        });
        disconnectAudioElement(peer);
    }
    // Handle pushToTalk, if set
    useEffect(() => {
        if (!connectionStuff.current.instream)
            return;
        connectionStuff.current.instream.getAudioTracks()[0].enabled =
            settings.pushToTalkMode !== pushToTalkOptions.PUSH_TO_TALK;
        connectionStuff.current.pushToTalkMode = settings.pushToTalkMode;
    }, [settings.pushToTalkMode]);
    // Emit lobby settings to connected peers
    useEffect(() => {
        if (hostRef.current.isHost !== true)
            return;
        Object.values(peerConnections).forEach((peer) => {
            try {
                console.log('sendxx > ', JSON.stringify(settings.localLobbySettings));
                peer.send(JSON.stringify(settings.localLobbySettings));
            }
            catch (e) {
                console.warn('failed to update lobby settings: ', e);
            }
        });
        setLobbySettings({
            type: 'set',
            action: settings.localLobbySettings,
        });
    }, [settings.localLobbySettings, hostRef.current.isHost]);
    useEffect(() => {
        for (const peer in audioElements.current) {
            audioElements.current[peer].pan.maxDistance = maxDistanceRef.current;
        }
    }, [lobbySettings.maxDistance, lobbySettings.visionHearing]);
    useEffect(() => {
        var _a, _b;
        if (!gameState ||
            !gameState.players ||
            !connectionStuff.current.socket ||
            (!hostRef.current.mobileRunning && !settings.obsOverlay)) {
            return;
        }
        if (hostRef.current.mobileRunning) {
            (_a = connectionStuff.current.socket) === null || _a === void 0 ? void 0 : _a.emit('signal', {
                to: gameState.lobbyCode + '_mobile',
                data: { gameState, lobbySettings },
            });
        }
        if (settings.obsOverlay &&
            settings.obsSecret &&
            settings.obsSecret.length === 9 &&
            ((gameState.gameState !== GameState.UNKNOWN && gameState.gameState !== GameState.MENU) ||
                gameState.oldGameState !== gameState.gameState)) {
            connectionStuff.current.overlaySocket = connectionStuff.current.socket;
            const obsvoiceState = {
                overlayState: {
                    gameState: gameState.gameState,
                    players: gameState.players.map((o) => {
                        var _a;
                        return ({
                            id: o.id,
                            clientId: o.clientId,
                            inVent: o.inVent,
                            isDead: o.isDead,
                            name: o.name,
                            colorId: o.colorId,
                            hatId: o.hatId,
                            petId: o.petId,
                            skinId: o.skinId,
                            visorId: o.visorId,
                            disconnected: o.disconnected,
                            isLocal: o.isLocal,
                            shiftedColor: o.shiftedColor,
                            bugged: o.bugged,
                            realColor: playerColors[o.colorId],
                            usingRadio: o.clientId === impostorRadioClientId.current && (myPlayer === null || myPlayer === void 0 ? void 0 : myPlayer.isImpostor),
                            connected: (playerSocketIdsRef.current[o.clientId] &&
                                ((_a = socketClients[playerSocketIdsRef.current[o.clientId]]) === null || _a === void 0 ? void 0 : _a.clientId) === o.clientId) ||
                                false,
                        });
                    }),
                },
                otherTalking,
                otherDead,
                localTalking: talking,
                localIsAlive: !(myPlayer === null || myPlayer === void 0 ? void 0 : myPlayer.isDead),
                mod: gameState.mod,
                oldMeetingHud: gameState.oldMeetingHud,
            };
            (_b = connectionStuff.current.overlaySocket) === null || _b === void 0 ? void 0 : _b.emit('signal', {
                to: settings.obsSecret,
                data: obsvoiceState,
            });
        }
    }, [gameState]);
    // Add settings to settingsRef
    useEffect(() => {
        settingsRef.current = settings;
    }, [settings]);
    // Add socketClients to socketClientsRef
    useEffect(() => {
        socketClientsRef.current = socketClients;
    }, [socketClients]);
    useEffect(() => {
        var _a, _b, _c, _d;
        if (((_b = (_a = connectionStuff.current) === null || _a === void 0 ? void 0 : _a.microphoneGain) === null || _b === void 0 ? void 0 : _b.gain) &&
            (settingsRef.current.microphoneGainEnabled || settingsRef.current.micSensitivityEnabled)) {
            if (!settingsRef.current.micSensitivityEnabled)
                connectionStuff.current.microphoneGain.gain.value = settings.microphoneGainEnabled
                    ? settings.microphoneGain / 100
                    : 1;
            if ((_d = (_c = connectionStuff.current) === null || _c === void 0 ? void 0 : _c.audioListener) === null || _d === void 0 ? void 0 : _d.options) {
                connectionStuff.current.audioListener.options.minNoiseLevel = settings.micSensitivity;
                connectionStuff.current.audioListener.init();
            }
        }
    }, [settings.microphoneGain, settings.micSensitivity]);
    const updateLobby = () => {
        var _a;
        console.log(gameState);
        if (!gameState ||
            !hostRef.current.isHost ||
            !gameState.lobbyCode ||
            gameState.gameState === GameState.MENU ||
            !gameState.players) {
            return;
        }
        (_a = connectionStuff.current.socket) === null || _a === void 0 ? void 0 : _a.emit('lobby', gameState.lobbyCode, {
            id: -1,
            title: lobbySettings.publicLobby_title,
            host: myPlayer === null || myPlayer === void 0 ? void 0 : myPlayer.name,
            current_players: gameState.players.length,
            max_players: gameState.maxPlayers,
            server: gameState.currentServer,
            language: lobbySettings.publicLobby_language,
            mods: gameState.mod,
            isPublic: lobbySettings.publicLobby_on,
            gameState: gameState.gameState,
        });
    };
    useEffect(() => {
        var _a;
        if (gameState.isHost && gameState.hostId > 0) {
            (_a = connectionStuff.current.socket) === null || _a === void 0 ? void 0 : _a.emit('setHost', gameState.lobbyCode, gameState.clientId);
            hostRef.current.serverHostId = gameState.hostId;
        }
    }, [gameState.isHost]);
    useEffect(() => {
        updateLobby();
    }, [
        gameState.gameState,
        (_a = gameState === null || gameState === void 0 ? void 0 : gameState.players) === null || _a === void 0 ? void 0 : _a.length,
        lobbySettings.publicLobby_title,
        lobbySettings.publicLobby_language,
        lobbySettings.publicLobby_on,
    ]);
    // Add lobbySettings to lobbySettingsRef
    useEffect(() => {
        lobbySettingsRef.current = lobbySettings;
    }, [lobbySettings]);
    // Set dead player data
    useEffect(() => {
        if (gameState.gameState === GameState.LOBBY) {
            setOtherDead({});
        }
        else if (gameState.gameState !== GameState.TASKS) {
            if (!gameState.players)
                return;
            setOtherDead((old) => {
                for (const player of gameState.players) {
                    old[player.clientId] = player.isDead || player.disconnected;
                }
                return Object.assign({}, old);
            });
        }
    }, [gameState.gameState]);
    // const [audioContext] = useState<AudioContext>(() => new AudioContext());
    const connectionStuff = useRef({
        pushToTalkMode: settings.pushToTalkMode,
        deafened: false,
        muted: false,
        impostorRadio: null,
        toggleMute: () => {
            /*empty*/
        },
        toggleDeafen: () => {
            /*empty*/
        },
    });
    useEffect(() => {
        (async () => {
            const context = new AudioContext();
            convolverBuffer.current = await context.decodeAudioData(reverbOgx);
            await context.close();
        })();
    }, []);
    useEffect(() => {
        const pressing = connectionStuff.current.impostorRadio;
        if (pressing == null ||
            !myPlayer ||
            !myPlayer.isImpostor ||
            myPlayer.isDead ||
            !(impostorRadioClientId.current === myPlayer.clientId || impostorRadioClientId.current === -1) ||
            !lobbySettingsRef.current.impostorRadioEnabled) {
            return;
        }
        radioOnAudio.play();
        connectionStuff.current.impostorRadio = pressing;
        impostorRadioClientId.current = pressing ? myPlayer.clientId : -1;
        for (const player of otherPlayers.filter((o) => o.isImpostor && !o.bugged && !o.isDead)) {
            const peer = playerSocketIdsRef.current[player.clientId];
            const connection = peerConnections[peer];
            if (connection !== undefined && connection.writable)
                connection === null || connection === void 0 ? void 0 : connection.send(JSON.stringify({ impostorRadio: connectionStuff.current.impostorRadio }));
        }
    }, [connectionStuff.current.impostorRadio]);
    useEffect(() => {
        // (async function anyNameFunction() {
        let currentLobby = '';
        // Connect to voice relay server
        connectionStuff.current.socket = io(settings.serverURL);
        const { socket } = connectionStuff.current;
        socket.on('error', (error) => {
            if (error.message) {
                setError(error.message);
            }
            console.error('socketIO error:', error);
            currentLobby = 'MENU';
        });
        socket.on('connect', () => {
            setConnected(true);
            console.log('CONNECTED??');
        });
        socket.on('setHost', (hostId) => {
            hostRef.current.serverHostId = hostId;
        });
        socket.on('disconnect', () => {
            setConnected(false);
            currentLobby = 'MENU';
            console.log('DISCONNECTED??');
        });
        notifyMobilePlayers();
        let iceConfig = DEFAULT_ICE_CONFIG;
        socket.on('clientPeerConfig', (clientPeerConfig) => {
            if (!validateClientPeerConfig(clientPeerConfig)) {
                let errorsFormatted = '';
                if (validateClientPeerConfig.errors) {
                    errorsFormatted = validateClientPeerConfig.errors
                        .map((error) => error.dataPath + ' ' + error.message)
                        .join('\n');
                }
                alert(`Server sent a malformed peer config. Default config will be used. See errors below:\n${errorsFormatted}`);
                return;
            }
            if (clientPeerConfig.forceRelayOnly &&
                !clientPeerConfig.iceServers.some((server) => server.urls.toString().includes('turn:'))) {
                alert('Server has forced relay mode enabled but provides no relay servers. Default config will be used.');
                return;
            }
            iceConfig = {
                iceTransportPolicy: clientPeerConfig.forceRelayOnly ? 'relay' : 'all',
                iceServers: clientPeerConfig.iceServers,
            };
        });
        socket.on('VAD', (data) => {
            setOtherVAD((old) => (Object.assign(Object.assign({}, old), { [data.client.clientId]: data.activity })));
        });
        socket.on('setClient', (socketId, client) => {
            setSocketClients((old) => (Object.assign(Object.assign({}, old), { [socketId]: client })));
        });
        socket.on('setClients', (clients) => {
            setSocketClients(clients);
        });
        // Initialize variables
        let audioListener;
        const audio = {
            deviceId: undefined,
            autoGainControl: false,
            channelCount: 2,
            echoCancellation: settings.echoCancellation,
            latency: 0,
            noiseSuppression: settings.noiseSuppression,
            sampleRate: 48000,
            sampleSize: 16,
        };
        // Get microphone settings
        if (settingsRef.current.microphone.toLowerCase() !== 'default')
            audio.deviceId = settingsRef.current.microphone;
        navigator.getUserMedia({ video: false, audio }, async (inStream) => {
            let stream = inStream;
            const ac = new AudioContext();
            let microphoneGain;
            const source = ac.createMediaStreamSource(inStream);
            if (settings.microphoneGainEnabled || settings.micSensitivityEnabled) {
                console.log('Microphone volume or sensitivityEnabled..');
                stream = (() => {
                    microphoneGain = ac.createGain();
                    const destination = ac.createMediaStreamDestination();
                    source.connect(microphoneGain);
                    microphoneGain.gain.value = settings.microphoneGainEnabled ? settings.microphoneGain / 100 : 1;
                    microphoneGain.connect(destination);
                    connectionStuff.current.microphoneGain = microphoneGain;
                    return destination.stream;
                })();
            }
            if (settingsRef.current.vadEnabled) {
                audioListener = VAD(ac, source, undefined, {
                    onVoiceStart: () => {
                        if (microphoneGain && settingsRef.current.micSensitivityEnabled) {
                            microphoneGain.gain.value = settingsRef.current.microphoneGainEnabled
                                ? settingsRef.current.microphoneGain / 100
                                : 1;
                        }
                        setTalking(true);
                    },
                    onVoiceStop: () => {
                        if (microphoneGain && settingsRef.current.micSensitivityEnabled) {
                            microphoneGain.gain.value = 0;
                        }
                        setTalking(false);
                    },
                    noiseCaptureDuration: 0,
                    stereo: false,
                });
                audioListener.options.minNoiseLevel = settingsRef.current.micSensitivityEnabled
                    ? settingsRef.current.micSensitivity
                    : 0.15;
                audioListener.options.maxNoiseLevel = 1;
                audioListener.init();
                connectionStuff.current.audioListener = audioListener;
                connectionStuff.current.microphoneGain = microphoneGain;
            }
            connectionStuff.current.stream = stream;
            connectionStuff.current.instream = inStream;
            inStream.getAudioTracks()[0].enabled = settings.pushToTalkMode !== pushToTalkOptions.PUSH_TO_TALK;
            connectionStuff.current.toggleDeafen = () => {
                connectionStuff.current.deafened = !connectionStuff.current.deafened;
                inStream.getAudioTracks()[0].enabled =
                    !connectionStuff.current.deafened &&
                        !connectionStuff.current.muted &&
                        connectionStuff.current.pushToTalkMode !== pushToTalkOptions.PUSH_TO_TALK;
                setDeafened(connectionStuff.current.deafened);
            };
            connectionStuff.current.toggleMute = () => {
                connectionStuff.current.muted = !connectionStuff.current.muted;
                if (connectionStuff.current.deafened) {
                    connectionStuff.current.deafened = false;
                    connectionStuff.current.muted = false;
                }
                inStream.getAudioTracks()[0].enabled =
                    !connectionStuff.current.muted &&
                        !connectionStuff.current.deafened &&
                        connectionStuff.current.pushToTalkMode !== pushToTalkOptions.PUSH_TO_TALK;
                setMuted(connectionStuff.current.muted);
                setDeafened(connectionStuff.current.deafened);
            };
            ipcRenderer.on(IpcRendererMessages.TOGGLE_DEAFEN, connectionStuff.current.toggleDeafen);
            ipcRenderer.on(IpcRendererMessages.IMPOSTOR_RADIO, (_, pressing) => {
                connectionStuff.current.impostorRadio = pressing;
            });
            ipcRenderer.on(IpcRendererMessages.TOGGLE_MUTE, connectionStuff.current.toggleMute);
            ipcRenderer.on(IpcRendererMessages.PUSH_TO_TALK, (_, pressing) => {
                if (connectionStuff.current.pushToTalkMode === pushToTalkOptions.VOICE)
                    return;
                if (!connectionStuff.current.deafened) {
                    inStream.getAudioTracks()[0].enabled =
                        connectionStuff.current.pushToTalkMode === pushToTalkOptions.PUSH_TO_TALK ? pressing : !pressing;
                }
            });
            audioElements.current = {};
            const connect = (lobbyCode, playerId, clientId, isHost) => {
                console.log('connect called..', lobbyCode);
                setOtherVAD({});
                setOtherTalking({});
                if (lobbyCode === 'MENU') {
                    Object.keys(peerConnections).forEach((k) => {
                        disconnectPeer(k);
                    });
                    setSocketClients({});
                    currentLobby = lobbyCode;
                }
                else if (currentLobby !== lobbyCode) {
                    console.log('Currentlobby', currentLobby, lobbyCode);
                    socket.emit('leave');
                    socket.emit('id', playerId, clientId);
                    socket.emit('join', lobbyCode, playerId, clientId, isHost);
                    currentLobby = lobbyCode;
                }
            };
            setConnect({ connect });
            function createPeerConnection(peer, initiator) {
                console.log('CreatePeerConnection: ', peer, initiator);
                const connection = new Peer({
                    stream,
                    initiator,
                    iceRestartEnabled: true,
                    config: settingsRef.current.natFix ? DEFAULT_ICE_CONFIG_TURN : iceConfig,
                });
                setPeerConnections((connections) => {
                    connections[peer] = connection;
                    return connections;
                });
                connection.on('connect', () => {
                    setTimeout(() => {
                        if (hostRef.current.isHost && connection.writable) {
                            try {
                                console.log('sending settings..');
                                connection.send(JSON.stringify(lobbySettingsRef.current));
                            }
                            catch (e) {
                                console.warn('failed to update lobby settings: ', e);
                            }
                        }
                    }, 1000);
                });
                connection.on('stream', async (stream) => {
                    console.log('ONSTREAM');
                    setAudioConnected((old) => (Object.assign(Object.assign({}, old), { [peer]: true })));
                    const dummyAudio = new Audio();
                    dummyAudio.srcObject = stream;
                    const context = new AudioContext();
                    const source = context.createMediaStreamSource(stream);
                    const dest = context.createMediaStreamDestination();
                    const gain = context.createGain();
                    const pan = context.createPanner();
                    gain.gain.value = 0;
                    pan.refDistance = 0.1;
                    pan.panningModel = 'equalpower';
                    pan.distanceModel = 'linear';
                    pan.maxDistance = maxDistanceRef.current;
                    pan.rolloffFactor = 1;
                    const muffle = context.createBiquadFilter();
                    muffle.type = 'lowpass';
                    source.connect(pan);
                    pan.connect(gain);
                    const reverb = context.createConvolver();
                    reverb.buffer = convolverBuffer.current;
                    const destination = dest;
                    // if (settingsRef.current.vadEnabled) {
                    // 	VAD(context, gain, undefined, {
                    // 		onVoiceStart: () => setTalking(true),
                    // 		onVoiceStop: () => setTalking(false),
                    // 		stereo: false,
                    // 	});
                    // }
                    gain.connect(destination);
                    const audio = document.createElement('audio');
                    document.body.appendChild(audio);
                    audio.setAttribute('autoplay', '');
                    audio.srcObject = dest.stream;
                    if (settingsRef.current.speaker.toLowerCase() !== 'default') {
                        audio.setSinkId(settingsRef.current.speaker);
                    }
                    if (audioElements.current[peer]) {
                        disconnectAudioElement(peer);
                    }
                    audioElements.current[peer] = {
                        dummyAudioElement: dummyAudio,
                        audioElement: audio,
                        gain,
                        pan,
                        reverb,
                        muffle,
                        muffleConnected: false,
                        reverbConnected: false,
                        destination,
                    };
                });
                connection.on('signal', (data) => {
                    socket.emit('signal', {
                        data,
                        to: peer,
                    });
                });
                connection.on('data', (data) => {
                    var _a, _b;
                    const parsedData = JSON.parse(data);
                    if (parsedData.hasOwnProperty('impostorRadio')) {
                        const clientId = (_a = socketClientsRef.current[peer]) === null || _a === void 0 ? void 0 : _a.clientId;
                        if (impostorRadioClientId.current === -1 && parsedData['impostorRadio']) {
                            impostorRadioClientId.current = clientId;
                        }
                        else if (impostorRadioClientId.current === clientId && !parsedData['impostorRadio']) {
                            impostorRadioClientId.current = -1;
                        }
                        console.log('Recieved impostor radio request', parsedData);
                    }
                    if (parsedData.hasOwnProperty('maxDistance')) {
                        if (!hostRef.current || hostRef.current.parsedHostId !== ((_b = socketClientsRef.current[peer]) === null || _b === void 0 ? void 0 : _b.clientId))
                            return;
                        Object.keys(lobbySettings).forEach((field) => {
                            if (field in parsedData) {
                                setLobbySettings({
                                    type: 'setOne',
                                    action: [field, parsedData[field]],
                                });
                            }
                            else {
                                if (field in defaultlocalLobbySettings) {
                                    setLobbySettings({
                                        type: 'setOne',
                                        action: [field, defaultlocalLobbySettings[field]],
                                    });
                                }
                            }
                        });
                    }
                });
                connection.on('close', () => {
                    console.log('Disconnected from', peer, 'Initiator:', initiator);
                    disconnectPeer(peer);
                });
                connection.on('error', () => {
                    console.log('ONERROR');
                    /*empty*/
                });
                return connection;
            }
            socket.on('join', async (peer, client) => {
                const oldSocketId = playerSocketIdsRef.current[client.clientId];
                if (oldSocketId && audioElements.current[oldSocketId]) {
                    disconnectAudioElement(oldSocketId);
                }
                createPeerConnection(peer, true);
                setSocketClients((old) => (Object.assign(Object.assign({}, old), { [peer]: client })));
            });
            socket.on('signal', ({ data, from }) => {
                //console.log('onsignal', JSON.stringify(data));
                if (data.hasOwnProperty('mobilePlayerInfo')) {
                    // eslint-disable-line
                    const mobiledata = data;
                    if (mobiledata.mobilePlayerInfo.code === hostRef.current.code &&
                        hostRef.current.gamestate !== GameState.MENU) {
                        hostRef.current.mobileRunning = true;
                        console.log('setting mobileRunning to true..');
                    }
                    return;
                }
                console.log('ONSIGNAL', data);
                let connection;
                if (!socketClientsRef.current[from]) {
                    console.warn('SIGNAL FROM UNKOWN SOCKET..');
                    return;
                }
                if (data.hasOwnProperty('type')) {
                    // if (data.type === 'offer' && peerConnections[from]) {
                    // 	console.log("Got offer with already a connection")
                    // }
                    if (peerConnections[from] && data.type !== 'offer') {
                        console.log('Send to existing peer 1');
                        connection = peerConnections[from];
                    }
                    else {
                        console.log('Send to new peer 1');
                        connection = createPeerConnection(from, false);
                    }
                    connection.signal(data);
                }
            });
        }, (error) => {
            console.error(error);
            setError("Couldn't connect to your microphone:\n" + error);
            // ipcRenderer.send(IpcMessages.SHOW_ERROR_DIALOG, {
            // 	title: 'Error',
            // 	content: 'Couldn\'t connect to your microphone:\n' + error
            // });
        });
        return () => {
            var _a;
            hostRef.current.mobileRunning = false;
            socket.emit('leave');
            Object.keys(peerConnections).forEach((k) => {
                disconnectPeer(k);
            });
            (_a = connectionStuff.current.socket) === null || _a === void 0 ? void 0 : _a.close();
            audioListener === null || audioListener === void 0 ? void 0 : audioListener.destroy();
        };
        // })();
    }, []);
    //data: { mobilePlayerInfo: { code: this.gamecode, askingForHost: true }
    const myPlayer = useMemo(() => {
        if (!gameState || !gameState.players) {
            return undefined;
        }
        else {
            return gameState.players.find((p) => p.isLocal);
        }
    }, [gameState.players]);
    const otherPlayers = useMemo(() => {
        var _a, _b;
        let otherPlayers;
        if (!gameState || !gameState.players || !myPlayer)
            return [];
        else
            otherPlayers = gameState.players.filter((p) => !p.isLocal);
        maxDistanceRef.current = lobbySettings.visionHearing
            ? myPlayer.isImpostor
                ? lobbySettings.maxDistance
                : gameState.lightRadius + 0.5
            : lobbySettings.maxDistance;
        if (maxDistanceRef.current <= 0.6) {
            maxDistanceRef.current = 1;
        }
        hostRef.current = {
            map: gameState.map,
            mobileRunning: hostRef.current.mobileRunning,
            gamestate: gameState.gameState,
            code: gameState.lobbyCode,
            hostId: gameState.hostId,
            isHost: gameState.hostId > 0 ? gameState.isHost : hostRef.current.serverHostId === gameState.clientId,
            parsedHostId: gameState.hostId > 0 ? gameState.hostId : hostRef.current.serverHostId,
            serverHostId: hostRef.current.serverHostId,
        };
        const playerSocketIds = {};
        for (const k of Object.keys(socketClients)) {
            playerSocketIds[socketClients[k].clientId] = k;
        }
        playerSocketIdsRef.current = playerSocketIds;
        const handledPeerIds = [];
        let foundRadioUser = false;
        const tempTalking = Object.assign({}, otherTalking);
        let talkingUpdate = false;
        for (const player of otherPlayers) {
            const peerId = playerSocketIds[player.clientId];
            const audio = player.clientId === myPlayer.clientId ? undefined : audioElements.current[peerId];
            if (player.clientId === impostorRadioClientId.current &&
                player.isImpostor &&
                !player.isDead &&
                !player.disconnected &&
                !player.bugged) {
                foundRadioUser = true;
            }
            if (audio) {
                handledPeerIds.push(peerId);
                let gain = calculateVoiceAudio(gameState, settingsRef.current, myPlayer, player, audio);
                if (connectionStuff.current.deafened || ((_a = playerConfigs[player.nameHash]) === null || _a === void 0 ? void 0 : _a.isMuted)) {
                    gain = 0;
                }
                if (gain > 0) {
                    const playerVolume = (_b = playerConfigs[player.nameHash]) === null || _b === void 0 ? void 0 : _b.volume;
                    gain = playerVolume === undefined ? gain : gain * playerVolume;
                    if (myPlayer.isDead && !player.isDead) {
                        gain = gain * (settings.ghostVolume / 100);
                    }
                    gain = gain * (settings.masterVolume / 100);
                }
                audio.gain.gain.value = gain;
                tempTalking[player.clientId] = otherVAD[player.clientId] && gain > 0;
                if (tempTalking[player.clientId] != otherTalking[player.clientId]) {
                    talkingUpdate = true;
                }
            }
        }
        if (talkingUpdate) {
            setOtherTalking(tempTalking);
        }
        if (((!foundRadioUser && impostorRadioClientId.current !== myPlayer.clientId) || !myPlayer.isImpostor) &&
            impostorRadioClientId.current !== -1) {
            impostorRadioClientId.current = -1;
        }
        for (const peerId in Object.keys(audioElements.current).filter((e) => !handledPeerIds.includes(e))) {
            const audio = audioElements.current[peerId];
            if (audio && audio.gain) {
                audio.gain.gain.value = 0;
            }
            // maybe disconnect later
        }
        return otherPlayers;
    }, [gameState]);
    // Connect to P2P negotiator, when lobby and connect code change
    useEffect(() => {
        var _a, _b;
        if (connect === null || connect === void 0 ? void 0 : connect.connect) {
            connect.connect((_a = gameState === null || gameState === void 0 ? void 0 : gameState.lobbyCode) !== null && _a !== void 0 ? _a : 'MENU', (_b = myPlayer === null || myPlayer === void 0 ? void 0 : myPlayer.id) !== null && _b !== void 0 ? _b : 0, gameState.clientId, gameState.isHost);
            updateLobby();
        }
    }, [connect === null || connect === void 0 ? void 0 : connect.connect, gameState === null || gameState === void 0 ? void 0 : gameState.lobbyCode, connected]);
    useEffect(() => {
        var _a;
        if ((myPlayer === null || myPlayer === void 0 ? void 0 : myPlayer.shiftedColor) != -1) {
            (_a = connectionStuff.current.socket) === null || _a === void 0 ? void 0 : _a.emit('VAD', false);
            setTalking(false);
        }
    }, [myPlayer === null || myPlayer === void 0 ? void 0 : myPlayer.shiftedColor]);
    useEffect(() => {
        var _a;
        if ((myPlayer === null || myPlayer === void 0 ? void 0 : myPlayer.shiftedColor) == -1 || !talking)
            (_a = connectionStuff.current.socket) === null || _a === void 0 ? void 0 : _a.emit('VAD', talking);
    }, [talking]);
    // Connect to P2P negotiator, when game mode change
    useEffect(() => {
        var _a;
        if ((connect === null || connect === void 0 ? void 0 : connect.connect) &&
            gameState.lobbyCode &&
            (myPlayer === null || myPlayer === void 0 ? void 0 : myPlayer.clientId) !== undefined &&
            gameState.gameState === GameState.LOBBY &&
            (gameState.oldGameState === GameState.DISCUSSION || gameState.oldGameState === GameState.TASKS)) {
            hostRef.current.mobileRunning = false;
            connect.connect(gameState.lobbyCode, myPlayer.clientId, gameState.clientId, gameState.isHost);
        }
        else if (gameState.oldGameState !== GameState.UNKNOWN &&
            gameState.oldGameState !== GameState.MENU &&
            gameState.gameState === GameState.MENU) {
            console.log('DISCONNECT TO MENU!');
            // On change from a game to menu, exit from the current game properly
            hostRef.current.mobileRunning = false; // On change from a game to menu, exit from the current game properly
            (_a = connectionStuff.current.socket) === null || _a === void 0 ? void 0 : _a.emit('leave');
            Object.keys(peerConnections).forEach((k) => {
                disconnectPeer(k);
            });
            setOtherDead({});
        }
    }, [gameState.gameState]);
    // Emit player id to socket
    useEffect(() => {
        if (connectionStuff.current.socket && myPlayer && myPlayer.clientId !== undefined) {
            connectionStuff.current.socket.emit('id', myPlayer.id, gameState.clientId);
        }
    }, [myPlayer === null || myPlayer === void 0 ? void 0 : myPlayer.id, myPlayer === null || myPlayer === void 0 ? void 0 : myPlayer.clientId]);
    // Pass voice state to overlay
    useEffect(() => {
        if (!settings.enableOverlay) {
            return;
        }
        ipcRenderer.send(IpcMessages.SEND_TO_OVERLAY, IpcOverlayMessages.NOTIFY_VOICE_STATE_CHANGED, {
            otherTalking,
            playerSocketIds: playerSocketIdsRef.current,
            otherDead,
            socketClients,
            audioConnected,
            localTalking: talking,
            localIsAlive: !(myPlayer === null || myPlayer === void 0 ? void 0 : myPlayer.isDead),
            impostorRadioClientId: !(myPlayer === null || myPlayer === void 0 ? void 0 : myPlayer.isImpostor) ? -1 : impostorRadioClientId.current,
            muted: mutedState,
            deafened: deafenedState,
            mod: gameState.mod,
        });
    }, [
        otherTalking,
        otherDead,
        socketClients,
        audioConnected,
        talking,
        mutedState,
        deafenedState,
        impostorRadioClientId.current,
    ]);
    return (React.createElement("div", { className: classes.root },
        (error || initialError) && (React.createElement("div", { className: classes.error },
            React.createElement(Typography, { align: "center", variant: "h6", color: "error" }, "ERROR"),
            React.createElement(Typography, { align: "center", style: { whiteSpace: 'pre-wrap' } },
                error,
                initialError),
            React.createElement(SupportLink, null))),
        (!error && !initialError) && (React.createElement(React.Fragment, null,
            React.createElement("div", { className: classes.top },
                myPlayer && gameState.lobbyCode !== 'MENU' && (React.createElement(React.Fragment, null,
                    React.createElement("div", { className: classes.avatarWrapper },
                        React.createElement(Avatar, { deafened: deafenedState, muted: mutedState, player: myPlayer, borderColor: (myPlayer === null || myPlayer === void 0 ? void 0 : myPlayer.shiftedColor) == -1 ? '#2ecc71' : 'gray', connectionState: connected ? 'connected' : 'disconnected', isUsingRadio: (myPlayer === null || myPlayer === void 0 ? void 0 : myPlayer.isImpostor) && impostorRadioClientId.current === myPlayer.clientId, talking: talking, isAlive: !myPlayer.isDead, size: 100, mod: gameState.mod })))),
                React.createElement("div", { className: classes.right },
                    React.createElement("div", null,
                        React.createElement("div", { className: classes.left },
                            myPlayer && (gameState === null || gameState === void 0 ? void 0 : gameState.gameState) !== GameState.MENU && (React.createElement("span", { className: classes.username }, myPlayer.name)),
                            React.createElement("span", { className: classes.code, style: {
                                    background: gameState.lobbyCode === 'MENU' ? 'transparent' : '#3e4346',
                                } }, displayedLobbyCode === 'MENU' ? t('game.menu') : displayedLobbyCode)),
                        gameState.lobbyCode !== 'MENU' && (React.createElement("div", { className: classes.muteButtons },
                            React.createElement(IconButton, { onClick: connectionStuff.current.toggleMute, size: "small" }, mutedState || deafenedState ? React.createElement(MicOff, null) : React.createElement(Mic, null)),
                            React.createElement(IconButton, { onClick: connectionStuff.current.toggleDeafen, size: "small" }, deafenedState ? React.createElement(VolumeOff, null) : React.createElement(VolumeUp, null))))))),
            lobbySettings.deadOnly && (React.createElement("div", { className: classes.top },
                React.createElement("small", { style: { padding: 0 } }, t('settings.lobbysettings.ghost_only_warning2')))),
            lobbySettings.meetingGhostOnly && (React.createElement("div", { className: classes.top },
                React.createElement("small", { style: { padding: 0 } }, t('settings.lobbysettings.meetings_only_warning2')))),
            gameState.lobbyCode && React.createElement(Divider, null),
            displayedLobbyCode === 'MENU' && (React.createElement("div", { className: classes.top },
                React.createElement(Button, { style: { margin: '10px' }, onClick: () => {
                        ipcRenderer.send(IpcHandlerMessages.OPEN_LOBBYBROWSER);
                    }, color: "primary", variant: "outlined" }, t('buttons.public_lobby')))),
            myPlayer && gameState.lobbyCode !== 'MENU' && (React.createElement(Grid, { container: true, spacing: 1, className: classes.otherplayers, alignItems: "flex-start", alignContent: "flex-start", justify: "flex-start" }, otherPlayers.map((player) => {
                var _a;
                const peer = playerSocketIdsRef.current[player.clientId];
                const connected = ((_a = socketClients[peer]) === null || _a === void 0 ? void 0 : _a.clientId) === player.clientId || false;
                const audio = audioConnected[peer];
                if (!playerConfigs[player.nameHash]) {
                    playerConfigs[player.nameHash] = { volume: 1, isMuted: false };
                }
                const socketConfig = playerConfigs[player.nameHash];
                return (React.createElement(Grid, { item: true, key: player.id, xs: getPlayersPerRow(otherPlayers.length) },
                    React.createElement(Avatar, { connectionState: !connected ? 'disconnected' : audio ? 'connected' : 'novoice', player: player, talking: !player.inVent && otherTalking[player.clientId], borderColor: "#2ecc71", isAlive: !otherDead[player.clientId], isUsingRadio: (myPlayer === null || myPlayer === void 0 ? void 0 : myPlayer.isImpostor) &&
                            !(player.disconnected || player.bugged) &&
                            impostorRadioClientId.current === player.clientId, size: 50, socketConfig: socketConfig, onConfigChange: () => {
                            store.set(`playerConfigMap.${player.nameHash}`, playerConfigs[player.nameHash]);
                        }, mod: gameState.mod })));
            }))))),
        otherPlayers.length <= 6 && React.createElement(Footer, null)));
};
function getPlayersPerRow(playerCount) {
    if (playerCount <= 9)
        return (12 / 3);
    else
        return Math.min(12, Math.floor(12 / Math.ceil(Math.sqrt(playerCount))));
}
export default Voice;
//# sourceMappingURL=Voice.js.map