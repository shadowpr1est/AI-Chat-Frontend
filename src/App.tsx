import {Routes, Route, Outlet, Link, useParams, Navigate} from 'react-router-dom';
import {useEffect, useState} from "react";
import EmojiPicker, { EmojiStyle, SkinTones } from 'emoji-picker-react';
import { useQuery } from '@tanstack/react-query';

import OpenAI from "openai";


type Message = {
    id: string;
    from: 'me' | 'user';
    text: string;
    timestamp: string;
};

type Chat = {
    id: string;
    username: string;
    avatar: string;
    messages: Message[];
};

const mockChats: Chat[] = [
    {
        id: 'chat1',
        username: 'Franklin St.',
        avatar: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSTUhN__BL_cmIy61MBL-5RYAei4dcx4EmKew&s',
        messages: [
            {
                id: 'msg1',
                from: 'user',
                text: 'Привет! Как дела?',
                timestamp: '2025-06-05T10:00:00Z',
            },
            {
                id: 'msg2',
                from: 'me',
                text: 'Привет, всё плохо.',
                timestamp: '2025-06-05T10:01:00Z',
            },
        ],
    },
    {
        id: 'chat2',
        username: 'Guts',
        avatar: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRuYuax-xWoZo_zG1rzvbRDk2pV6K5zGiFJQA&s',
        messages: [
            {
                id: 'msg1',
                from: 'user',
                text: 'Пойдешь сегодня в качалку?',
                timestamp: '2025-06-05T09:30:00Z',
            },
        ],
    },
    {
        id: 'chat3',
        username: 'AI Ассистент',
        avatar: 'https://cdn-icons-png.flaticon.com/512/4712/4712037.png',
        messages: [
            {
                id: 'msg1',
                from: 'me',
                text: 'Расскажи анекдот.',
                timestamp: '2025-06-05T08:20:00Z',
            },
            {
                id: 'msg2',
                from: 'user',
                text: 'Идёт утка по болоту. Грязно, но весело!',
                timestamp: '2025-06-05T08:21:00Z',
            },
        ],
    },
];

const LOCAL_STORAGE_KEY = 'my-chat-history';

function Chat() {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const openai = apiKey ? new OpenAI({apiKey, dangerouslyAllowBrowser: true}) : null;
    const [showPicker, setShowPicker] = useState(false);
    const {id} = useParams();
    const [input, setInput] = useState('');
    const [chats, setChats] = useState<Chat[]>(() => {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        return stored ? JSON.parse(stored) : mockChats;
    });

    const onEmojiClick = (emojiObject: { activeSkinTone?: SkinTones; unified?: string; unifiedWithoutSkinTone?: string; emoji: any; names?: string[]; imageUrl?: string; getImageUrl?: (emojiStyle?: EmojiStyle) => string; isCustom?: boolean; }) => {
        setInput(prev => prev + emojiObject.emoji);
    };
    const chat = chats.find(c => c.id === id);
    const isAIChat = chat?.username === 'AI Ассистент';

    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(chats));
    }, [chats]);
    if (!chat) {
        return <div className="p-4">Чат не найден</div>;
    }
    const sendMessage = async () => {
        if (input.trim() === '') {
            return;
        }

        const newMessage: Message = {
            id: `msg-${Date.now()}`,
            from: 'me',
            text: input.trim(),
            timestamp: new Date().toISOString()
        };

        // Если это чат с ИИ и нет ключа — просто добавляем своё сообщение и показываем предупреждение
        if (isAIChat && !apiKey) {
            setChats(chats => chats.map(c =>
                c.id === id ? { ...c, messages: [...c.messages, newMessage] } : c
            ));
            setInput('');
            return;
        }

        // Обычный чат или чат с ИИ с ключом
        setChats(chats => chats.map(c =>
            c.id === id ? { ...c, messages: [...c.messages, newMessage] } : c
        ));
        setInput('');
        if (isAIChat && openai) {
            try{
                const aiResponse = await openai.responses.create({
                    model: "gpt-4.1",
                    instructions: "Ты ИИ ассистент в социальной сети тебя зовут Semicolon AI, соблюдай правила этикета",
                    input: input
                });
                const aiMessage: Message = {
                    id: `msg-${Date.now()}`,
                    from: 'user',
                    text: aiResponse.output_text.trim(),
                    timestamp: new Date().toISOString()
                }
                setChats(chats => chats.map(c =>
                    c.id === id ? { ...c, messages: [...c.messages, aiMessage] } : c
                ));
            }catch (e) {
                console.error('Ошибка запроса к AI:', e);
            }
        }
    }

    return (
        <div className="flex-1 bg-[var(--bg-primary)] flex flex-col h-screen overflow-hidden">
            {/* Верхняя панель */}
            <div className="h-16 border-b border-[var(--border-color)] px-4 flex items-center space-x-4 bg-white">
                <img src={chat.avatar} className="w-10 h-10 rounded-full" alt="avatar" />
                <h2 className="text-base font-semibold text-[var(--text-primary)] truncate">{chat.username}</h2>
                {isAIChat && !apiKey && (
                    <span className="ml-4 text-xs text-red-500">ИИ недоступен (нет ключа)</span>
                )}
            </div>
            {/* Сообщения */}
            <div className="flex-1 px-2 sm:px-4 md:pl-[20%] md:pr-[20%] overflow-y-auto py-2 space-y-2 bg-[var(--bg-secondary)]">
                {chat.messages.map(msg => (
                    <div
                        key={msg.id}
                        className={`w-full flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`inline-block max-w-[90%] sm:max-w-[75%] px-4 py-2 rounded-xl text-sm leading-snug break-words ${
                                msg.from === 'me'
                                    ? 'bg-[var(--message-out)] text-right'
                                    : 'bg-[var(--message-in)] text-left'
                            }`}
                        >
                            {msg.text}
                        </div>
                    </div>
                ))}
            </div>
            {/* Инпут */}
            <div className="relative px-2 sm:px-4 md:pl-[20%] md:pr-[20%] border-t border-[var(--border-color)] bg-white py-3">
                <input
                    type="text"
                    placeholder={isAIChat && !apiKey ? "ИИ недоступен" : "Написать сообщение..."}
                    value={input}
                    onChange={event => setInput(event.target.value)}
                    onKeyDown={event => (event.key === 'Enter' && sendMessage())}
                    className="w-full border border-[var(--border-color)] rounded-full px-4 py-2 text-sm focus:outline-none"
                    disabled={isAIChat && !apiKey}
                />
                <button
                    onClick={() => setShowPicker(!showPicker)}
                    className="absolute pt-1.5 text-xl"
                    disabled={isAIChat && !apiKey}
                >
                    😊
                </button>
                {showPicker && !(!apiKey && isAIChat) && (
                    <div className="absolute bottom-16 left-4 z-50">
                        <EmojiPicker onEmojiClick={(e) => onEmojiClick(e)} />
                    </div>
                )}
            </div>
        </div>
    );
}

function fetchChats(): Promise<Chat[]> {
    return new Promise(resolve => {
        setTimeout(() => resolve(mockChats), 500);
    });
}

function Navbar() {
    const [search, setSearch] = useState('');
    const { data: chats = [], isLoading, error } = useQuery({
        queryKey: ['chats'],
        queryFn: fetchChats,
    });
    const filteredChat = chats.filter(c => c.username.toLowerCase().includes(search.toLowerCase()));
    let displayChats = chats;
    if (search) {
        displayChats = filteredChat;
    }

    return (
        <>
            <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
                <h1 className="text-lg font-bold text-[var(--text-primary)]">Чаты</h1>
            </div>

            <div className="hidden md:flex bg-[var(--bg-primary)] border-r border-[var(--border-color)] w-80 h-screen flex-col">
                {/* Поиск */}
                <div className="h-16 px-5 flex items-center">
                    <input
                        type="text"
                        placeholder="Поиск"
                        onChange={e => setSearch(e.target.value)}
                        value={search}
                        className="w-full px-4 py-2 text-sm border border-[var(--border-color)] rounded-full bg-white focus:outline-none"
                    />
                </div>

                <div className="overflow-y-auto">
                    {isLoading && <div className="px-4 py-3 text-gray-400">Загрузка...</div>}
                    {error && <div className="px-4 py-3 text-red-500">Ошибка загрузки чатов</div>}
                    {displayChats.map((chat: Chat) => (
                        <Link to={`/chat/${chat.id}`} key={chat.id}>
                            <div className="px-4 py-3 flex items-center border-b border-[var(--border-color)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer">
                                <img
                                    src={chat.avatar}
                                    className="w-12 h-12 rounded-full object-cover"
                                    alt="avatar"
                                />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-[var(--text-primary)]">{chat.username}</p>
                                    <p className="text-xs text-[var(--text-secondary)] truncate max-w-[200px]">
                                        {chat.messages[chat.messages.length - 1]?.text || ''}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </>
    );
}

export function App() {
    const AppLayout = () => (
        <div className="flex h-screen">
            <Navbar/>
            <Outlet/>
        </div>
    );
    return (
        <Routes>
            <Route element={<AppLayout/>}>
                <Route path="/chat/:id" element={<Chat/>}/>
                <Route path="/" element={<Navigate to="/chat/chat1" replace />} />
            </Route>
        </Routes>
    );
}
