import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sheets_v4 } from 'googleapis';
import { CaracteristicasSistema } from 'src/interfaces/sheets/caracteristicas-sistema/caracteristicas-sistema.interface';
import { Economicas } from 'src/interfaces/sheets/cotizacion/economicas.interface';
import { CuadroTarifario } from 'src/interfaces/sheets/cuadro-tarifario/cuadro-tarifario.interface';
import { InversionCostos } from 'src/interfaces/sheets/inversion-ycostos/inversion-costos.interface';
import { TasaDescuento } from 'src/interfaces/sheets/tasa-descuento/tasa-descuento.interface';

@Injectable()
export class VariablesOnlineService {
  
  private readonly spreadsheetId: string;
  private readonly rangeCaracteristicas: string;
  private readonly rangeEconomicas: string;
  private readonly rangeInversionCostos: string;
  private readonly rangeCuadroTarifario: string;

  constructor(private readonly configService: ConfigService) {
    this.spreadsheetId = this.configService.get<string>('GOOGLE_SHEET_ID');
    this.rangeCaracteristicas = this.configService.get<string>(
      'GOOGLE_SHEET_RANGE_CARACTERISTICAS',
    );
    this.rangeEconomicas = this.configService.get<string>(
      'GOOGLE_SHEET_RANGE_ECONOMICAS',
    );
    this.rangeInversionCostos = this.configService.get<string>(
      'GOOGLE_SHEET_RANGE_INVERSION_COSTOS',
    );

    this.rangeCuadroTarifario = this.configService.get<string>(
      'GOOGLE_SHEET_RANGE_CUADRO_TARIFARIO',
    )
    
  }

  async getCuadroTarifario(googleSheetClient: sheets_v4.Sheets): Promise<CuadroTarifario[]> {
    try {
      const response = await googleSheetClient.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId, 
        range: this.rangeCuadroTarifario,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        throw new Error('No se encontraron datos en el rango especificado.');
      }

      const cuadroTarifario: CuadroTarifario[] = rows.map((row) => ({
        nombre: row[0] as CuadroTarifario['nombre'], // Tarifa
        cargoVariableConsumoArsKWh: parseFloat(row[1]), // Cargo variable consumo
        cargoVariableInyeccionArsKWh: parseFloat(row[2]), // Cargo variable inyección
        tension: row[3] as CuadroTarifario['tension'], // Tensión
      }));

      return cuadroTarifario;
    } catch (error) {
      throw new Error(
        'No se pudieron obtener los cuadros tarifarios.',
      );
    }
  }

  async getInversionYCostos(
    googleSheetClient: sheets_v4.Sheets,
  ): Promise<InversionCostos> {
    try {
      const response = await googleSheetClient.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: this.rangeInversionCostos,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        throw new Error('No se encontraron datos en el rango especificado.');
      }

      const inversionYCostos: InversionCostos = {
        costoUsdWp: parseFloat(rows[0][1]),
        equipoDeMedicionUsd: parseFloat(rows[1][1]),
        costoDeMantenimientoInicialUsd: parseFloat(rows[2][1]),
      };

      return inversionYCostos;
    } catch (error) {
      throw new Error(
        'No se pudieron obtener las características del sistema.',
      );
    }
  }

  async getCaracteristicasSistema(
    googleSheetClient: sheets_v4.Sheets,
  ): Promise<CaracteristicasSistema> {
    try {
      const response = await googleSheetClient.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: this.rangeCaracteristicas,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        throw new Error('No se encontraron datos en el rango especificado.');
      }

      const caracteristicasSistema: CaracteristicasSistema = {
        eficienciaInstalacion: this.parsePercentage(rows[0][1]) / 100,
        degradacionAnualPanel: this.parsePercentage(rows[1][1]) / 100,
        proporcionAutoconsumo: this.parsePercentage(rows[2][1]) / 100,
        proporcionInyeccion: (100 - this.parsePercentage(rows[2][1])) / 100,
      };

      return caracteristicasSistema;
    } catch (error) {
      throw new Error(
        'No se pudieron obtener las características del sistema.',
      );
    }
  }

  async getEconomicas(
    googleSheetClient: sheets_v4.Sheets,
  ): Promise<Economicas> {
    try {
      const response = await googleSheetClient.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: this.rangeEconomicas,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        throw new Error('No se encontraron datos en el rango especificado.');
      }

      const parseEconomicas = (value: string): number => {
        return parseFloat(value);
      };

      const economicas: Economicas = {
        tipoCambioArs: parseEconomicas(rows[0][1]),
        tasaInflacionUsd: parseEconomicas(rows[1][1]),
        tasaDescuentoFlujoFondosUsd: parseEconomicas(rows[2][1])
      };

      return economicas;
    } catch (error) {
      throw new Error('No se pudieron obtener la cotizacion.');
    }
  }

  private parsePercentage(value: string): number {
    return parseFloat(value.replace('%', '').trim());
  }
}