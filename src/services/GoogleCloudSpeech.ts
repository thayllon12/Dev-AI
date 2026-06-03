/**
 * Google Cloud Speech-to-Speech Implementation Example
 * 
 * Este arquivo contém o exemplo de implementação técnica para um aplicativo React.
 * Ele integra o Speech-to-Text V2 (modelo Chirp em Streaming) e o Text-to-Speech (vozes Neural2/Studio).
 * 
 * PRÉ-REQUISITOS E BIBLIOTECAS NECESSÁRIAS:
 * 1. npm install @google-cloud/speech @google-cloud/text-to-speech socket.io-client
 * 2. Conta no Google Cloud Platform com 'Cloud Speech-to-Text API' e 'Cloud Text-to-Speech API' ativadas.
 * 3. Chave de Serviço (Service Account JSON) para autenticação.
 * 
 * NOTA DE ARQUITETURA:
 * Por motivos de segurança, as APIs do Google Cloud exigem chaves privadas que NÃO PODEM ser expostas 
 * no frontend (React). A arquitetura correta requer um backend (Node.js/Express) que intermedeia o 
 * streaming de áudio via WebSockets.
 * 
 * Abaixo está a Lógica Cliente-Servidor recomendada para baixa latência.
 */

// ==========================================
// 1. CONFIGURAÇÃO JSON DA API (BACKEND NODE.JS)
// ==========================================
export const sttConfigV2 = {
  config: {
    // Modelo Chirp (V2) para máxima precisão em português
    model: 'chirp',
    languageCodes: ['pt-BR'],
    autoDecodingConfig: {},
    features: {
      enableAutomaticPunctuation: true, // Pontuação automática perfeita
    },
  },
  streamingConfig: {
    interimResults: true, // Resultados parciais para reduzir latência = fluidez estilo Gemini Live
  }
};

export const ttsConfig = {
  audioConfig: {
    audioEncoding: 'LINEAR16',
    pitch: -2.0, // Entonação mais grave/masculina
    speakingRate: 1.05, // Velocidade fluida
    sampleRateHertz: 24000,
  },
  voice: {
    languageCode: 'pt-BR',
    // Privilegie vozes avançadas do tipo Neural2 ou Studio
    name: 'pt-BR-Neural2-B', // Exemplo de voz masculina natural
  }
};

// ==========================================
// 2. LÓGICA DE DETECÇÃO DE ATIVIDADE DE VOZ (VAD) NO CLIENTE
// ==========================================
// A biblioteca `hark` é excelente para VAD no microfone do navegador.
// npm install hark

export class VoiceActivityDetector {
  private stream: MediaStream;
  private harkOps: any; // Instância do hark
  
  constructor(stream: MediaStream, onSpeechStart: () => void, onSpeechEnd: () => void) {
    this.stream = stream;
    // O hark escuta os níveis de db do array de áudio e dispara os eventos
    // @ts-ignore
    this.harkOps = hark(this.stream, { threshold: -50, play: false });
    
    this.harkOps.on('speaking', () => {
      console.log('🗣️ Usuário começou a falar...');
      onSpeechStart();
    });

    this.harkOps.on('stopped_speaking', () => {
      console.log('🛑 Usuário parou de falar.');
      onSpeechEnd();
    });
  }

  public stop() {
    this.harkOps.stop();
  }
}

// ==========================================
// 3. EXEMPLO DE FLUXO REACT (FRONTEND) COM WEBSOCKETS (SOCKET.IO)
// ==========================================
/*
import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import hark from 'hark';

export const SpeechToSpeechLive = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const socketRef = useRef<Socket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    // Conecta ao seu servidor Node.js que fará a ponte segura com o GCP
    socketRef.current = io('http://localhost:4000');

    // Recebe o áudio gerado pelo TTS Neural2 do servidor e reproduz em tempo real!
    socketRef.current.on('audioResponse', (audioData: ArrayBuffer) => {
      playAudio(audioData);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const playAudio = async (audioData: ArrayBuffer) => {
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const audioBuffer = await audioContextRef.current.decodeAudioData(audioData);
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.start(0);
  };

  const startLiveConversation = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioContextRef.current = new AudioContext({ sampleRate: 16000 }); // GCP requer 16000Hz idealmente

      const inputSource = audioContextRef.current.createMediaStreamSource(stream);
      scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(2048, 1, 1);
      
      inputSource.connect(scriptProcessorRef.current);
      scriptProcessorRef.current.connect(audioContextRef.current.destination);

      // Enviando stream bruto (buffer) via socket para a GCP API
      scriptProcessorRef.current.onaudioprocess = (e) => {
        if (!isListening) return;
        const left = e.inputBuffer.getChannelData(0);
        // Converte Float32Array para Int16Array para o GCP Speech-to-Text
        const l = left.length;
        const buf = new Int16Array(l);
        for (let i = 0; i < l; i++) {
            buf[i] = Math.min(1, left[i]) * 0x7FFF;
        }
        socketRef.current?.emit('audioStream', buf.buffer);
      };

      // VAD Integration para fechar a requisição sem cliques manuais
      const speechEvents = hark(stream, { threshold: -50, interval: 200 });
      speechEvents.on('stopped_speaking', () => {
         // Avisa o backend que o usuário terminou a frase para processar a requisição no Gemini e chamar o TTS
         socketRef.current?.emit('speechEnded');
      });

      setIsListening(true);
    } catch (e) {
        console.error("Erro ao acessar o microfone", e);
    }
  };

  const stopConversation = () => {
    setIsListening(false);
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    scriptProcessorRef.current?.disconnect();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: 20 }}>
      <h3>Modo Gemini Live Integrado</h3>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={startLiveConversation} disabled={isListening}>Ouvir / Streaming</button>
        <button onClick={stopConversation} disabled={!isListening}>Parar</button>
      </div>
      <p>{transcript}</p>
    </div>
  );
};
*/
