import math

def format_duration(seconds):
    days = int(seconds // 86400)
    seconds %= 86400
    hours = int(seconds // 3600)
    seconds %= 3600
    minutes = int(seconds // 60)
    seconds %= 60
    return f"{days}d {hours}h {minutes}m {int(seconds)}s"

def run_simulation():
    happiness = 100
    base_seconds_per_point = 900 # 15 minutes
    total_time = 0
    
    print(f"{'Range':<15} | {'Avg Sec/Point':<15} | {'Time Taken':<20}")
    print("-" * 60)
    
    block_start_happiness = 100
    block_time = 0
    block_points = 0
    
    current_happiness = 100
    
    # We want to simulate the drop FROM current_happiness to current_happiness - 1
    # The logic in app.js calculates rate based on current happiness before decrement.
    
    while current_happiness > 0:
        # Logic from app.js:
        # const segment = Math.floor((100 - pet.happiness) / 5);
        # const rateMultiplier = Math.pow(1.1, segment); 
        
        segment = math.floor((100 - current_happiness) / 5)
        rate_multiplier = 1.1 ** segment
        seconds_for_point = base_seconds_per_point / rate_multiplier
        
        total_time += seconds_for_point
        block_time += seconds_for_point
        block_points += 1
        
        current_happiness -= 1
        
        if current_happiness % 10 == 0:
            avg_rate = block_time / block_points
            range_str = f"{block_start_happiness}->{current_happiness}"
            print(f"{range_str:<15} | {avg_rate:<15.2f} | {format_duration(block_time):<20}")
            
            block_start_happiness = current_happiness
            block_time = 0
            block_points = 0

    print("-" * 60)
    print(f"Total Time (100 -> 0): {format_duration(total_time)}")

def check_decay_from_2_to_0():
    print("\n" + "="*60)
    print("Checking specific decay duration from 2 -> 0")
    print("="*60)
    
    current_happiness = 2
    base_seconds_per_point = 900
    total_time = 0
    
    while current_happiness > 0:
        segment = math.floor((100 - current_happiness) / 5)
        rate_multiplier = 1.1 ** segment
        seconds_for_point = base_seconds_per_point / rate_multiplier
        
        print(f"Happiness {current_happiness} -> {current_happiness - 1}:")
        print(f"  Segment: {segment}")
        print(f"  Multiplier: {rate_multiplier:.4f}")
        print(f"  Time required: {seconds_for_point:.2f}s")
        
        total_time += seconds_for_point
        current_happiness -= 1
        
    print("-" * 60)
    print(f"Total Time (2 -> 0): {format_duration(total_time)}")

if __name__ == "__main__":
    run_simulation()
    check_decay_from_2_to_0()
