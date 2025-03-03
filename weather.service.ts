import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, delay } from 'rxjs/operators';
/*
This angular service file pulls data from the NOAA Weather Service. After pulling data using http get call,
it uses the RxJS data transformation map operator to create the image. The url data is also being pulled from
the NOAA weather REST Service. 
*/
@Injectable({ providedIn: 'root' })
export class WeatherService {
  constructor(private http: HttpClient) { }

  getWeatherForCityFromNoaa(city: string): Observable<any> {
    const path = `https://api.noaa.org/data/2.5/weather?q=${city}&units=metric&APPID=695ed9f29c4599b7544d0db5c211d499`;
    return this.http.get<any>(path).pipe(
      // The spread operator (...) in JavaScript is a syntax that expands an iterable 
      // (like an array or object) into individual elements. When used with objects, it copies the properties 
      // from one or more objects into a new object. This allows for creating new objects based on existing ones, 
      // adding new properties, or modifying existing ones without directly altering the original objects.  
      map(data => ({
        ...data,
        image: `http://noaa.org/img/wn/${data.weather[0].icon}@2x.png`
      })),
      delay(500)
    );
  }
}
