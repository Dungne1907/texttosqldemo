#include <SDL2/SDL.h>
#include <SDL2/SDL_ttf.h>
#include <string>
#include <chrono>
#include <ctime>
#include <iostream>

const int WINDOW_WIDTH = 800;
const int WINDOW_HEIGHT = 400;
const int FONT_SIZE = 48;

struct TimeBlock {
    SDL_Rect rect;
    std::string value;
    std::string label;
};

class CountdownTimer {
private:
    SDL_Window* window;
    SDL_Renderer* renderer;
    TTF_Font* fontLarge;
    TTF_Font* fontSmall;
    TimeBlock blocks[4];
    bool running;

    void initSDL() {
        if (SDL_Init(SDL_INIT_VIDEO) < 0) {
            throw std::runtime_error("SDL could not initialize!");
        }

        if (TTF_Init() < 0) {
            throw std::runtime_error("SDL_ttf could not initialize!");
        }

        window = SDL_CreateWindow("New Year Countdown",
            SDL_WINDOWPOS_UNDEFINED, SDL_WINDOWPOS_UNDEFINED,
            WINDOW_WIDTH, WINDOW_HEIGHT, SDL_WINDOW_SHOWN);

        if (!window) {
            throw std::runtime_error("Window could not be created!");
        }

        renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_ACCELERATED);
        if (!renderer) {
            throw std::runtime_error("Renderer could not be created!");
        }

        fontLarge = TTF_OpenFont("arial.ttf", FONT_SIZE);
        if (!fontLarge) {
            throw std::runtime_error("Failed to load font (large)!");
        }

        fontSmall = TTF_OpenFont("arial.ttf", FONT_SIZE / 2);
        if (!fontSmall) {
            throw std::runtime_error("Failed to load font (small)!");
        }

        // Initialize time blocks
        int blockWidth = 150;
        int blockHeight = 150;
        int spacing = 20;
        int startX = (WINDOW_WIDTH - (blockWidth * 4 + spacing * 3)) / 2;
        int startY = (WINDOW_HEIGHT - blockHeight) / 2;

        const char* labels[] = {"DAYS", "HOURS", "MINUTES", "SECONDS"};
        for (int i = 0; i < 4; i++) {
            blocks[i].rect = {
                startX + i * (blockWidth + spacing),
                startY,
                blockWidth,
                blockHeight
            };
            blocks[i].value = "00";
            blocks[i].label = labels[i];
        }
    }

    void updateCountdown() {
        auto now = std::chrono::system_clock::now();
        auto now_time_t = std::chrono::system_clock::to_time_t(now);
        std::tm* now_tm = std::localtime(&now_time_t);
        
        int currentYear = now_tm->tm_year + 1900;
        std::tm newYear = *now_tm;
        newYear.tm_year = currentYear - 1900 + 1;  // tm_year is years since 1900; +1 = next year
        newYear.tm_mon = 0;
        newYear.tm_mday = 1;
        newYear.tm_hour = 0;
        newYear.tm_min = 0;
        newYear.tm_sec = 0;
        
        auto newYear_time = std::mktime(&newYear);
        auto diff = std::chrono::system_clock::from_time_t(newYear_time) - now;
        
        auto days = std::chrono::duration_cast<std::chrono::hours>(diff).count() / 24;
        auto hours = std::chrono::duration_cast<std::chrono::hours>(diff).count() % 24;
        auto minutes = std::chrono::duration_cast<std::chrono::minutes>(diff).count() % 60;
        auto seconds = std::chrono::duration_cast<std::chrono::seconds>(diff).count() % 60;

        blocks[0].value = std::to_string(days);
        blocks[1].value = std::to_string(hours);
        blocks[2].value = std::to_string(minutes);
        blocks[3].value = std::to_string(seconds);

        // Add leading zeros
        for (auto& block : blocks) {
            if (block.value.length() == 1) {
                block.value = "0" + block.value;
            }
        }
    }

    void render() {
        SDL_SetRenderDrawColor(renderer, 26, 26, 26, 255);
        SDL_RenderClear(renderer);

        // Render title
        SDL_Color textColor = {255, 255, 255, 255};
        SDL_Surface* titleSurface = TTF_RenderText_Solid(fontLarge, "New Year Countdown", textColor);
        SDL_Texture* titleTexture = SDL_CreateTextureFromSurface(renderer, titleSurface);
        SDL_Rect titleRect = {
            (WINDOW_WIDTH - titleSurface->w) / 2,
            20,
            titleSurface->w,
            titleSurface->h
        };
        SDL_RenderCopy(renderer, titleTexture, NULL, &titleRect);
        SDL_FreeSurface(titleSurface);
        SDL_DestroyTexture(titleTexture);

        // Render time blocks
        for (const auto& block : blocks) {
            // Draw block background
            SDL_SetRenderDrawColor(renderer, 255, 255, 255, 25);
            SDL_RenderFillRect(renderer, &block.rect);

            // Draw value
            SDL_Surface* valueSurface = TTF_RenderText_Solid(fontLarge, block.value.c_str(), textColor);
            SDL_Texture* valueTexture = SDL_CreateTextureFromSurface(renderer, valueSurface);
            SDL_Rect valueRect = {
                block.rect.x + (block.rect.w - valueSurface->w) / 2,
                block.rect.y + 20,
                valueSurface->w,
                valueSurface->h
            };
            SDL_RenderCopy(renderer, valueTexture, NULL, &valueRect);
            SDL_FreeSurface(valueSurface);
            SDL_DestroyTexture(valueTexture);

            // Draw label
            SDL_Surface* labelSurface = TTF_RenderText_Solid(fontSmall, block.label.c_str(), textColor);
            SDL_Texture* labelTexture = SDL_CreateTextureFromSurface(renderer, labelSurface);
            SDL_Rect labelRect = {
                block.rect.x + (block.rect.w - labelSurface->w) / 2,
                block.rect.y + block.rect.h - labelSurface->h - 20,
                labelSurface->w,
                labelSurface->h
            };
            SDL_RenderCopy(renderer, labelTexture, NULL, &labelRect);
            SDL_FreeSurface(labelSurface);
            SDL_DestroyTexture(labelTexture);
        }

        SDL_RenderPresent(renderer);
    }

public:
    CountdownTimer() : window(nullptr), renderer(nullptr), fontLarge(nullptr), fontSmall(nullptr), running(true) {
        initSDL();
    }

    ~CountdownTimer() {
        TTF_CloseFont(fontLarge);
        TTF_CloseFont(fontSmall);
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        TTF_Quit();
        SDL_Quit();
    }

    void run() {
        while (running) {
            SDL_Event event;
            while (SDL_PollEvent(&event)) {
                if (event.type == SDL_QUIT) {
                    running = false;
                }
            }

            updateCountdown();
            render();
            SDL_Delay(1000);
        }
    }
};

int main(int argc, char* argv[]) {
    try {
        CountdownTimer timer;
        timer.run();
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
    return 0;
} 