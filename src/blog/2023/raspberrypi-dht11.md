---
title: "Raspberry pi - DHT11 - .Net 開發"
pubDate: 2023-03-13
description: "Raspberry pi - DHT11 - .Net 開發"
author: 州・Kevin
tags:
  - .Net
  - C#
  - DHT11
  - Raspberry pi
---

經過前面幾次的撰寫﹐使用 .Net IoT Libraries 做開發似乎比較有些心得了﹐DHT11 是一個常見的元件用來偵測環境的溫度和濕度﹐網路上用 python 撰寫的範例多如牛毛﹐這次就用 .Net IoT 來試試看。

### 環境

Main Board：Rrapberry Pi Model 3 B+  
OS：Pi OS  
Language：C# .Net

從 [**.NET IoT Libraries API**](<https://learn.microsoft.com/zh-tw/dotnet/api/?view=iot-dotnet-latest>) 中找到許多和 DHT 相關的資料

![](images/001.png)

這裏可以看到有我們想要的 DHT11﹐於是根據這個 library的內容撰寫了第一版

```cs
using Iot.Device.DHTxx;
Console.WriteLine("DHT11 temperature & humidity test. Ctrl+C to end.");
int pin = 4;
// Dht11 dht11 = new Dht11(pin, PinNumberingScheme.Logical);
using Dht11 dht11 = new Dht11(pin);
while (true) {
  Console.WriteLine($"System Time：{DateTime.Now.ToString("yyyy/MM/dd HH:mm:ss")}");
  if (dht11.IsLastReadSuccessful) {
    Console.WriteLine($"Temperature：{dht11.Temperature}");
    Console.WriteLine($"Humidity：{dht11.Humidity}");
  } else {
    Console.WriteLine("can not read value.");
  }
  Console.WriteLine("======================================================");
  await Task.Delay(5000);
}
```

然後上傳執行

![](images/002.png)

在這段程式我用的是 Temperature 和 Humidity來取得數值﹐很不幸的﹐沒有如預期的取得溫度和濕度；這兩個在微軟API函式中都有標註是 Obsolete﹐不過原本我想即使是過時的應該也還是能用﹐但事與願違﹐後來是必須使用Try版本的method才能順利讀取資料。

在Discord 的 .Net IoT 社群提出疑問﹐得到的說明是過時的方法或Try版本的方法都應該有效﹐但 DHT 設備的通訊是有時間要求的﹐不論用那種框架/語言讀取數據﹐任何最小的延遲都可能導致通訊中斷﹐這些延遲主要是由於操作系統造成的。

於是改用 Try 版本修改後如下

```cs
    public class DHT11Sample {
        public static ThData? TestTH(int GpioPin) {
            ThData? thData = null;
            try {
                using Dht11 dht11 = new(GpioPin);
                Temperature temperature = default;
                RelativeHumidity humidity = default;
                bool success = dht11.TryReadTemperature(out temperature) && dht11.TryReadHumidity(out humidity);
                if (success) {
                    thData = new ThData() {
                        Temperature = temperature.DegreesCelsius,
                        Humidity = humidity.Percent,
                        Equipment = Utility.GetHostName()
                    };
                }
            } catch (Exception er) {
                Console.WriteLine($"DHT11 未預期的錯誤:{er.Message}");
            }
            return thData;
        }
    }

```

執行後確實是可以使用 DHT 11讀取到數值﹐不過以每2秒執行一次並不是每次都能成功讀到數值﹐因為使用 try 這個版本是偵測成功才會回應﹐如果就前述任何最小的延遲都可能導致通訊中斷﹐那麼每一次的執行不一定能讀取到數據﹐我覺得還算合理﹐但在 python 庫的範例卻每次都能讀到資料﹐這是什麼差別呢？