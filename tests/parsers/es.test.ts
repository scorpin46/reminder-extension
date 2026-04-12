import { describe, it, expect  } from 'vitest';
import {TextParserProvider} from "@/modules/textParserProvider";

describe('TextParserProvider - Spanish (es)', () => {
    const parser = new TextParserProvider('es-ES');

    it('should parse "Tomar un descanso en 30 minutos"', () => {
        const result = parser.parse('Tomar un descanso en 30 minutos');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.parserSource).toBe('chrono');
        expect(result.cleanText).toBe('Tomar un descanso');
        expect(result.error).toBeNull();
    });

    it('should parse "Llamar al mensajero en 2 horas"', () => {
        const result = parser.parse('Llamar al mensajero en 2 horas');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.parserSource).toBe('chrono');
        expect(result.cleanText).toBe('Llamar al mensajero');
        expect(result.error).toBeNull();
    });

    it('should parse "Almorzar el próximo lunes a las 13:00"', () => {
        const result = parser.parse('Almorzar el próximo lunes a las 13:00');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.parserSource).toBe('chrono');
        expect(result.cleanText).toBe('Almorzar');
        expect(result.error).toBeNull();
    });
});