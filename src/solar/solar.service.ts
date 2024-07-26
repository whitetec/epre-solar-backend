import axios from 'axios';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { SolarCalculationDto } from './dto/solar-calculation.dto';
import { HttpService } from '@nestjs/axios';
import { CalculadoraService } from 'src/calculadora/calculadora.service';
import { SolarData } from 'src/interfaces/solar-data/solar-data.interface';
import { TarifaCategoria } from 'src/tarifa-categoria/tarifa-categoria-enum';

@Injectable()
export class SolarService {
  constructor(
    private readonly httpService: HttpService,
    private readonly calculadoraService: CalculadoraService,
  ) {}

  async getSolarData(latitude: number, longitude: number): Promise<any> {
    if (isNaN(latitude) || isNaN(longitude)) {
      throw new HttpException(
        'Invalid coordinates received',
        HttpStatus.BAD_REQUEST,
      );
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${latitude}&location.longitude=${longitude}&key=${apiKey}`;

    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        throw new HttpException(
          'Location out of coverage',
          HttpStatus.BAD_REQUEST,
        );
      } else {
        console.error('Error fetching data from API:', error.message);
        throw new HttpException(
          `An error occurred while fetching data: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  async calculateSolarSavings(
    solarCalculationDto: SolarCalculationDto,
  ): Promise<any> {
    
    const {latitude, longitude} = this.calculateCentroid(solarCalculationDto.coordenadas);

    const solarDataApi = await this.getSolarData(
      latitude,
      longitude,
    );
    const solarData: SolarData = {
      yearlyEnergyDcKwh: solarDataApi.solarPotential.solarPanelConfigs[1].yearlyEnergyDcKwh,
      panels: {
          panelsCount: solarDataApi.solarPotential.solarPanelConfigs[1].panelsCount,
          panelCapacityW: solarDataApi.solarPotential.panelCapacityWatts

      },
      carbonOffsetFactorKgPerMWh: solarDataApi.solarPotential.carbonOffsetFactorKgPerMwh,
      tarifaCategory: TarifaCategoria.T1_G1,
    }
    
    return await this.calculadoraService.calculateEnergySavings(
      solarCalculationDto.annualConsumption,
      solarData,
    );
  }

  // Método para calcular el centroide de una superficie
  private calculateCentroid(coordenadas: any[]): { latitude: number; longitude: number } {
    let sumLat = 0;
    let sumLng = 0;

    for (const coord of coordenadas) {
      const lat = parseFloat(coord.lat);
      const lng = parseFloat(coord.lng);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        sumLat += lat;
        sumLng += lng;
      } else {
        console.error(`Invalid coordinate found: ${coord.latitude}, ${coord.longitude}`);
      }
    }

    const centroidLat = sumLat / coordenadas.length;
    const centroidLng = sumLng / coordenadas.length;
    
    return { latitude: centroidLat, longitude: centroidLng };
  }
}
