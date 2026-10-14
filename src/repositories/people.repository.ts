import { Location } from "./chat.repository";

export interface Interest
{
    id: number,
    name: string,
    created: number
};

export interface Person
{
    id: number,
    first_name: string,
    last_name: string,
    email: string,
    location: Location,
    created_at: number,
    updated_at: number,
    interests: Interest[]
};

export type PersonUpdate = Partial<Pick<Person, "first_name" | "last_name" | "email" | "location" | "interests">>;

export class PeopleRepository
{
    private people: Person[] = [];
    private interests: Interest[] = [];

    findAll(): Person[] {
        return this.people;
    }

    findById(id: number): Person | undefined {
        return this.people.find((person) => person.id === id);
    }

    findInterestsByIds(ids: number[]): Interest[] {
        return this.interests.filter((interest) => ids.includes(interest.id));
    }

    delete(id: number): boolean {
        const index = this.people.findIndex((person) => person.id === id);
        if (index === -1) {
            return false;
        }

        this.people.splice(index, 1);
        return true;
    }

    update(id: number, changes: PersonUpdate): Person | undefined {
        const person = this.findById(id);
        if (!person) {
            return undefined;
        }

        Object.assign(person, changes, { updated_at: Math.floor(Date.now() / 1000) });
        return person;
    }

    create(first_name: string, last_name: string, email: string, location: Location, interests: Interest[]): Person
    {
        const now = Math.floor(Date.now() / 1000);
        const newPerson: Person = {
            id: this.generateId(),
            first_name,
            last_name,
            email,
            location,
            created_at: now,
            updated_at: now,
            interests
        };

        this.people.push(newPerson);
        return newPerson;
    }

    // Person IDs are 5-digit numbers
    private generateId(): number {
        let id: number;
        do {
            id = Math.floor(10000 + Math.random() * 90000);
        } while (this.findById(id));
        return id;
    }
}

