import { Component, OnInit } from '@angular/core';
import { WeatherService } from '../weather.service';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { map, filter, concatMap, tap } from 'rxjs/operators';

// This component is the ts file for the presentation file.
// It calls the NOAA REST API to pull the weather data based on the city name.

@Component({
  selector: 'app-weather-report',
  templateUrl: './weather-report.component.html',
  styleUrls: ['./weather-report.component.scss']
})
export class WeatherReportingComponent implements OnInit {
  weatherData$: Observable<any>;

  today: Date = new Date();

  loading = false;

  constructor(
    private weatherService: WeatherService,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.weatherData$ = this.route.params.pipe(
      map(params => params.locationName),
      filter(name => !!name),
      tap(() => {
        this.loading = true;
      }),
      concatMap(name => this.weatherService.getWeatherForCityFromNoaa(name)),
      tap(() => {
        this.loading = false;
      })
    );
  }
}
