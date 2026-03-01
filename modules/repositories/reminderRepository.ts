import { reactive } from 'vue';
import Dexie, { liveQuery, Table } from 'dexie';
import {omit} from "zod/mini";

const DB_NAME = 'ReminderDatabase';

// Единый базовый тип для БД
interface ReminderInterface {
    id: number | undefined;
    title: string;
    desc: string | null;
    datetime: number | Date;
    createdAt: number | Date;
    updatedAt: number | Date;
    completed: 0 | 1;
    notificationId: string | null;
    googleEventId: string | null;
    googleSync: 0 | 1;
    googleSyncDate: number | Date | null;
}

type Reminder = {
    [K in keyof ReminderInterface]: K extends 'googleSyncDate'
        ? Date | null
        : K extends 'datetime' | 'createdAt' | 'updatedAt'
            ? Date
            : ReminderInterface[K];
};

// Состояние хранилища
interface ReminderState {
    isLoaded: boolean;
    active: Reminder[];
    completed: Reminder[];
}

// Конвертеры
const toUI = (reminder: ReminderInterface): Reminder => ({
    ...reminder,
    datetime: new Date(reminder.datetime),
    createdAt: new Date(reminder.createdAt),
    updatedAt: new Date(reminder.updatedAt),
    googleSyncDate: reminder.googleSyncDate ? new Date(reminder.googleSyncDate) : null
});

export class ReminderRepository {
    private readonly state = reactive<ReminderState>({
        isLoaded: false,
        active: [],
        completed: [],
    });

    /* @ts-ignore */
    private readonly db: (Dexie & { reminders: Table<ReminderInterface, number>; });

    constructor() {
        this.db = new Dexie(DB_NAME, {}) as typeof this.db;

        this.db.version(3).stores({
            reminders: '++id, title, desc, datetime, createdAt, updatedAt, completed, notificationId, googleEventId, googleSync, googleSyncDate, [completed+datetime]'
        });

        // Хуки
        this.db.reminders.hook('reading', (reminder: ReminderInterface) => {
            return reminder ? toUI(reminder) : reminder
        });

        this.db.reminders.hook('creating', (_primKey: number, reminder: ReminderInterface) => {
            const now = Date.now();
            reminder.createdAt = now;
            reminder.updatedAt = now;
            reminder.completed = reminder.completed ? 1 : 0;
            reminder.googleSync = reminder.googleSync ? 1 : 0;
            reminder.datetime = +reminder.datetime;
        });

        this.db.reminders.hook('updating', (modifications: Partial<ReminderInterface>) => {
            const updates = { ...modifications, updatedAt: Date.now() };

            if (updates.datetime){
                updates.datetime = +updates.datetime;

                if (updates.datetime > Date.now()) {
                    updates.completed = 0;
                }
            }

            if (updates.createdAt){
                updates.createdAt = +updates.createdAt;
            }

            if ('completed' in updates){
                updates.completed = updates.completed ? 1 : 0;
            }

            if ('googleSync' in updates){
                updates.googleSync = updates.googleSync ? 1 : 0;
            }

            if (updates.id){
                delete updates.id;
            }

            return updates;
        });

        this.__initReactivity();
    }

    // Теперь мы не используем .filter(), а идем сразу по составному индексу
    private async __getActive(): Promise<Reminder[]> {
        return this.db.reminders
            .where('[completed+datetime]')
            .between([0, Dexie.minKey], [0, Dexie.maxKey])
            .toArray() as unknown as Promise<Reminder[]>;
    }

    private async __getCompleted(): Promise<Reminder[]> {
        return this.db.reminders
            .where('[completed+datetime]')
            .between([1, Dexie.minKey], [1, Dexie.maxKey])
            .reverse() // Последние завершенные будут сверху
            .toArray() as unknown as Promise<Reminder[]>;
    }
    
    private __initReactivity(): void {
        liveQuery(async () => {
            const active = await this.__getActive();
            const completed = await this.__getCompleted();

            return {
                active: this.__ensureSorted(active, 'datetime', 'asc'),
                completed: this.__ensureSorted(completed, 'datetime', 'desc')
            };
        }).subscribe({
            next: ({ active, completed }) => {
                this.state.active = active;
                this.state.completed = completed;
                this.state.isLoaded = true;
            },
            error: console.error
        });
    }

    private __ensureSorted<T extends Reminder>(
        data: T[],
        field: keyof T,
        direction: 'asc' | 'desc'
    ): T[] {
        if (!data?.length) return data;

        return data.every((item, i) =>
                i === 0 || (direction === 'asc'
                        ? +item[field] >= +data[i-1][field]
                        : +item[field] <= +data[i-1][field]
                )
        ) ? data : [...data].sort((a, b) =>
            direction === 'asc'
                ? +a[field] - +b[field]
                : +b[field] - +a[field]
        );
    }

    // Публичные методы
    async getById(id: number): Promise<Reminder | undefined> {
        const reminder = await this.db.reminders.get(+id);
        
        return reminder?.id ? toUI(reminder): undefined;
    }

    async getIdByNotificationId(notificationId: string): Promise<number | undefined> {
        const reminder = await this.db.reminders
            .where('notificationId')
            .equals(notificationId)
            .first();
        return reminder?.id;
    }

    async add(data: Partial<Reminder|ReminderInterface>): Promise<number> {
        delete data.id;
        return this.db.reminders.add(<ReminderInterface>data);
    }

    async update(id: number, data: Partial<Reminder|ReminderInterface>): Promise<number> {
        return this.db.reminders.update(+id, <ReminderInterface>data);
    }
    
    async complete(id: number): Promise<number> {
        return await this.update(+id, { completed: 1, datetime: Date.now() });
    }

    async delete(id: number): Promise<void> {
        await this.db.reminders.delete(+id);
    }

    async removeDatabase(): Promise<boolean> {
        try {
            this.db.close();
            await Dexie.delete(DB_NAME);
            return true;
        } catch (error) {
            console.error('Ошибка при удалении БД:', error);
            return false;
        }
    }
}

export type {Reminder, ReminderState};